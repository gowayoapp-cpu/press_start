import Phaser from 'phaser';
import { TOTAL_PARTS_REQUIRED } from '../config';
import { createControls, type Controls } from '../input/controls';
import { Carrot } from '../objects/Carrot';
import { Collectible } from '../objects/Collectible';
import { Player } from '../objects/Player';
import { RocketGoal } from '../objects/RocketGoal';
import { Robot } from '../objects/Robot';
import { activeSceneKeys, devLog, devSceneLifecycle } from '../utils/devLog';
import {
  addLife,
  addPart,
  getRunState,
  loseLife as loseRunStateLife,
  restartLevelFromBeginning,
  resetPowerupsForLevel,
  setLevel,
} from '../utils/runState';

interface Level2Data {
  fromDeath?: boolean;
  fromOutOfLives?: boolean;
}

export class Level2Scene extends Phaser.Scene {
  private player!: Player;
  private controls!: Controls;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private icePlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private robots!: Phaser.GameObjects.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private carrots!: Phaser.Physics.Arcade.Group;
  private rocket!: RocketGoal;
  private statusText!: Phaser.GameObjects.Text;
  private pauseText!: Phaser.GameObjects.Text;
  private transitioning = false;
  private pausedByUser = false;

  public constructor() {
    super('Level2Scene');
  }

  public create(data: Level2Data): void {
    devSceneLifecycle(this, 'create');
    this.transitioning = false;
    this.pausedByUser = false;
    this.physics.world.resume();
    this.time.timeScale = 1;
    setLevel(2);
    this.registry.set('hudObjective', '');
    resetPowerupsForLevel();

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    const worldWidth = 2900;
    const worldHeight = this.scale.height;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor('#091327');
    this.addBackdrop(worldWidth, worldHeight);

    this.platforms = this.physics.add.staticGroup();
    this.icePlatforms = this.physics.add.staticGroup();
    this.buildTerrain(worldWidth, worldHeight);

    this.player = new Player(this, 100, 425);
    this.player.setSpawnPoint(100, 425);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.icePlatforms);

    this.robots = this.add.group({ runChildUpdate: true });
    this.spawnRobot(860, 414, 700, 1010, 86);
    this.spawnRobot(1440, 286, 1330, 1600, 78);
    this.spawnRobot(2060, 334, 1920, 2230, 90);
    this.spawnRobot(2420, 440, 2280, 2580, 96);
    this.spawnRobot(2720, 440, 2570, 2840, 108);

    this.collectibles = this.physics.add.group();
    this.spawnCollectibles();
    this.carrots = this.physics.add.group();
    this.spawnCarrots();

    this.rocket = new RocketGoal(this, worldWidth - 100, worldHeight - 120);

    this.physics.add.overlap(this.player, this.collectibles, (_player, collectible) => {
      this.collectPart(collectible as Collectible);
    });
    this.physics.add.overlap(this.player, this.carrots, (_player, carrot) => {
      this.collectCarrot(carrot as Carrot);
    });
    this.physics.add.overlap(this.player, this.robots, () => this.handleRobotCollision());
    this.physics.add.overlap(this.player, this.rocket, () => this.tryLaunchRocket());

    this.controls = createControls(this);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.statusText = this.add
      .text(this.scale.width / 2, 60, '', {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#d6ebff',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2001);

    this.pauseText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Paused', {
        fontFamily: 'Verdana',
        fontSize: '46px',
        color: '#ffffff',
        stroke: '#11233f',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2100)
      .setVisible(false);

    if (data.fromDeath) {
      this.statusText.setText('Re-entry complete. Try again.');
    } else if (data.fromOutOfLives) {
      this.statusText.setText('Out of lives. Level restarted with 5 lives.');
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      devSceneLifecycle(this, 'shutdown');
      this.controls?.destroy();
      if (this.player && this.player.scene) {
        this.player.clearInvulnerabilityVisuals();
      }
    });
  }

  public update(): void {
    const controlsState = this.controls.getState();
    if (controlsState.pauseJustPressed) {
      this.togglePause();
    }

    if (this.transitioning || this.pausedByUser) {
      return;
    }

    const onIce = this.isPlayerOnIce();
    this.player.move(controlsState.horizontal, onIce);
    if (controlsState.jumpJustPressed) {
      this.player.jump();
    }

    if (this.player.y > this.scale.height + 140) {
      this.loseLife('Lost in the ice fields.');
    }

    const parts = getRunState().partsCollected;
    const rocketReady = parts >= TOTAL_PARTS_REQUIRED;
    this.rocket.setActivated(rocketReady);

    this.statusText.setText(
      rocketReady
        ? 'Rocket online. Reach it to enter Volcano Rift.'
        : `Rocket locked. Need ${TOTAL_PARTS_REQUIRED - parts} more part(s).`,
    );
  }

  private addBackdrop(worldWidth: number, worldHeight: number): void {
    const nebula = this.add.graphics();
    nebula.fillGradientStyle(0x0b2148, 0x0b2148, 0x08213f, 0x112c55, 0.95);
    nebula.fillRect(0, 0, worldWidth, worldHeight);
    nebula.setDepth(-10);

    const stars = this.add.graphics();
    stars.fillStyle(0xe5f2ff, 0.75);
    for (let i = 0; i < 240; i += 1) {
      stars.fillCircle(
        Phaser.Math.Between(0, worldWidth),
        Phaser.Math.Between(0, worldHeight),
        Phaser.Math.FloatBetween(0.5, 1.8),
      );
    }
    stars.setDepth(-9);
  }

  private buildTerrain(worldWidth: number, worldHeight: number): void {
    for (let x = 180; x < worldWidth; x += 360) {
      this.createPlatform(this.platforms, x, worldHeight - 14, 360, 28, 'platform');
    }

    this.createPlatform(this.platforms, 520, 408, 240, 24, 'platform');
    this.createPlatform(this.icePlatforms, 900, 360, 360, 24, 'ice');
    this.createPlatform(this.platforms, 1280, 308, 220, 24, 'platform');
    this.createPlatform(this.icePlatforms, 1610, 260, 420, 24, 'ice');
    this.createPlatform(this.platforms, 1980, 340, 220, 24, 'platform');
    this.createPlatform(this.icePlatforms, 2320, 456, 420, 24, 'ice');
    this.createPlatform(this.icePlatforms, 2680, 456, 260, 24, 'ice');
  }

  private createPlatform(
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
    texture: string,
  ): void {
    const platform = group.create(x, y, texture) as Phaser.Physics.Arcade.Image;
    platform.setDisplaySize(width, height).refreshBody();
  }

  private spawnCollectibles(): void {
    const positions = [
      { x: 560, y: 372 },
      { x: 980, y: 324 },
      { x: 1600, y: 226 },
      { x: 2060, y: 306 },
      { x: 2460, y: 420 },
    ];
    positions.forEach((position) => {
      const part = new Collectible(this, position.x, position.y);
      this.collectibles.add(part);
    });
  }

  private spawnCarrots(): void {
    const positions = [
      { x: 940, y: 322 },
      { x: 1990, y: 302 },
    ];
    positions.forEach((position) => {
      const carrot = new Carrot(this, position.x, position.y);
      this.carrots.add(carrot);
    });
  }

  private spawnRobot(
    x: number,
    y: number,
    minX: number,
    maxX: number,
    speed: number,
  ): void {
    const robot = new Robot(this, x, y, minX, maxX, speed);
    this.robots.add(robot);
    this.physics.add.collider(robot, this.platforms);
    this.physics.add.collider(robot, this.icePlatforms);
  }

  private collectPart(part: Collectible): void {
    if (!part.active || this.transitioning) {
      return;
    }
    part.collect();
    addPart();
  }

  private collectCarrot(carrot: Carrot): void {
    if (!carrot.active || this.transitioning) {
      return;
    }

    const previousLives = getRunState().lives;
    const nextLives = addLife(1);
    carrot.collect();
    this.statusText.setText(
      nextLives > previousLives ? 'Carrot collected: +1 life!' : 'Carrot collected: lives full.',
    );
  }

  private handleRobotCollision(): void {
    this.loseLife('Robot strike. Systems unstable.');
  }

  private loseLife(reason: string): void {
    if (this.transitioning || this.player.isInvulnerable()) {
      return;
    }

    const previousLives = getRunState().lives;
    const remainingLives = loseRunStateLife();
    devLog('Level2Scene:loseLife', {
      reason,
      fromLives: previousLives,
      toLives: remainingLives,
    });

    if (remainingLives <= 0) {
      this.handleOutOfLives();
      return;
    }

    this.transitioning = true;
    this.physics.world.resume();
    this.time.timeScale = 1;
    this.player.grantInvulnerability(750);
    this.cameras.main.flash(140, 255, 110, 110);
    this.statusText.setText(reason);
    this.time.delayedCall(170, () => {
      this.scene.restart({ fromDeath: true });
    });
  }

  private tryLaunchRocket(): void {
    if (this.transitioning) {
      return;
    }

    const parts = getRunState().partsCollected;
    if (!this.rocket.isActivated()) {
      this.statusText.setText(`Rocket needs ${TOTAL_PARTS_REQUIRED - parts} more part(s).`);
      return;
    }

    this.transitioning = true;
    devLog('Level2Scene:transition Level2 -> Level3', {
      activeScenes: activeSceneKeys(this),
    });
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.time.delayedCall(280, () => {
      setLevel(3);
      this.safeSceneStart('Level3Scene');
    });
  }

  private handleOutOfLives(): void {
    this.transitioning = true;
    this.pausedByUser = false;
    this.physics.world.resume();
    this.time.timeScale = 1;
    devLog('Level2Scene:transitionToMenuAfterGameOver', {
      activeScenes: activeSceneKeys(this),
    });
    this.statusText.setText('Out of lives! Restarting Level 2...');
    restartLevelFromBeginning(2);
    this.time.delayedCall(320, () => {
      this.scene.restart({ fromOutOfLives: true });
    });
  }

  private togglePause(): void {
    if (this.transitioning) {
      return;
    }

    this.pausedByUser = !this.pausedByUser;
    if (this.pausedByUser) {
      this.player.setAccelerationX(0);
      this.player.setVelocityX(0);
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
    this.pauseText.setVisible(this.pausedByUser);
  }

  private isPlayerOnIce(): boolean {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    if (!playerBody.blocked.down) {
      return false;
    }

    const playerBottom = playerBody.bottom;
    const playerLeft = playerBody.left;
    const playerRight = playerBody.right;

    let onIce = false;
    this.icePlatforms.children.each((child) => {
      if (onIce) {
        return false;
      }

      const platform = child as Phaser.Physics.Arcade.Image;
      const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody;
      const topMatch = Math.abs(playerBottom - platformBody.top) <= 6;
      const horizontalMatch =
        playerRight > platformBody.left + 4 && playerLeft < platformBody.right - 4;

      if (topMatch && horizontalMatch) {
        onIce = true;
        return false;
      }

      return true;
    });

    return onIce;
  }

  private safeSceneStart(nextKey: string): void {
    const active = activeSceneKeys(this);
    devLog('Level2Scene:safeSceneStart', {
      nextKey,
      activeScenes: active,
    });
    this.time.delayedCall(0, () => {
      this.scene.start(nextKey);
    });
  }
}
