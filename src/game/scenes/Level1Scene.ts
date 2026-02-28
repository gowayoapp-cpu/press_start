import Phaser from 'phaser';
import { LEVEL1_PARTS_REQUIRED } from '../config';
import { createControls, type Controls } from '../input/controls';
import { Carrot } from '../objects/Carrot';
import { Collectible } from '../objects/Collectible';
import { Player } from '../objects/Player';
import { Robot } from '../objects/Robot';
import { activeSceneKeys, devLog, devSceneLifecycle } from '../utils/devLog';
import {
  addLife,
  addPart,
  getRunState,
  loseLife as loseRunStateLife,
  restartLevelFromBeginning,
  resetRunState,
  resetPowerupsForLevel,
  setLevel,
} from '../utils/runState';

interface Level1Data {
  fromDeath?: boolean;
  fromOutOfLives?: boolean;
  resetProgress?: boolean;
}

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private controls!: Controls;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private robots!: Phaser.GameObjects.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private carrots!: Phaser.Physics.Arcade.Group;
  private exitGate!: Phaser.Physics.Arcade.Sprite;
  private statusText!: Phaser.GameObjects.Text;
  private pauseText!: Phaser.GameObjects.Text;
  private transitioning = false;
  private pausedByUser = false;

  public constructor() {
    super('Level1Scene');
  }

  public create(data: Level1Data): void {
    devSceneLifecycle(this, 'create');
    this.transitioning = false;
    this.pausedByUser = false;
    this.physics.world.resume();
    this.time.timeScale = 1;

    if (data.resetProgress) {
      resetRunState();
    }
    setLevel(1);
    this.registry.set('hudObjective', '');
    resetPowerupsForLevel();

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    const worldWidth = 2400;
    const worldHeight = this.scale.height;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor('#08152b');
    this.addBackdrop(worldWidth, worldHeight);

    this.platforms = this.physics.add.staticGroup();
    this.buildTerrain(worldWidth, worldHeight);

    this.player = new Player(this, 130, 425);
    this.player.setSpawnPoint(130, 425);
    this.physics.add.collider(this.player, this.platforms);

    this.robots = this.add.group({ runChildUpdate: true });
    this.spawnRobot(720, 426, 580, 850, 78);
    this.spawnRobot(1320, 308, 1180, 1470, 62);
    this.spawnRobot(1860, 366, 1720, 2050, 86);

    this.collectibles = this.physics.add.group();
    this.spawnCollectibles();
    this.carrots = this.physics.add.group();
    this.spawnCarrots();

    this.exitGate = this.physics.add
      .staticSprite(worldWidth - 120, worldHeight - 102, 'gate_closed')
      .setDepth(9);

    this.physics.add.overlap(this.player, this.collectibles, (_player, collectible) => {
      this.collectPart(collectible as Collectible);
    });
    this.physics.add.overlap(this.player, this.carrots, (_player, carrot) => {
      this.collectCarrot(carrot as Carrot);
    });
    this.physics.add.overlap(this.player, this.robots, () => this.handleRobotCollision());
    this.physics.add.overlap(this.player, this.exitGate, () => this.tryAdvanceToLevel2());

    this.controls = createControls(this);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.statusText = this.add
      .text(this.scale.width / 2, 60, '', {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#e3ecff',
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
      this.statusText.setText('Respawned. Stay sharp.');
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

    this.player.move(controlsState.horizontal, false);
    if (controlsState.jumpJustPressed) {
      this.player.jump();
    }

    if (this.player.y > this.scale.height + 140) {
      this.loseLife('The void took a life.');
    }

    const parts = getRunState().partsCollected;
    const gateReady = parts >= LEVEL1_PARTS_REQUIRED;
    this.exitGate.setTexture(gateReady ? 'gate_open' : 'gate_closed');
    this.statusText.setText(
      gateReady
        ? 'Gate unlocked. Reach it to enter Ice Orbit.'
        : `Collect ${LEVEL1_PARTS_REQUIRED - parts} more part(s) to unlock the gate.`,
    );
  }

  private addBackdrop(worldWidth: number, worldHeight: number): void {
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.7);
    for (let i = 0; i < 230; i += 1) {
      stars.fillCircle(
        Phaser.Math.Between(0, worldWidth),
        Phaser.Math.Between(0, worldHeight),
        Phaser.Math.FloatBetween(0.5, 1.6),
      );
    }
    stars.setDepth(-5);
  }

  private buildTerrain(worldWidth: number, worldHeight: number): void {
    for (let x = 180; x < worldWidth; x += 360) {
      this.createPlatform(this.platforms, x, worldHeight - 14, 360, 28, 'platform');
    }
    this.createPlatform(this.platforms, 470, 408, 280, 24, 'platform');
    this.createPlatform(this.platforms, 790, 348, 260, 24, 'platform');
    this.createPlatform(this.platforms, 1140, 302, 250, 24, 'platform');
    this.createPlatform(this.platforms, 1480, 256, 260, 24, 'platform');
    this.createPlatform(this.platforms, 1800, 370, 270, 24, 'platform');
    this.createPlatform(this.platforms, 2140, 326, 220, 24, 'platform');
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
      { x: 350, y: 434 },
      { x: 760, y: 310 },
      { x: 1180, y: 264 },
      { x: 1580, y: 218 },
      { x: 2125, y: 286 },
    ];
    positions.forEach((position) => {
      const part = new Collectible(this, position.x, position.y);
      this.collectibles.add(part);
    });
  }

  private spawnCarrots(): void {
    const positions = [
      { x: 500, y: 372 },
      { x: 1480, y: 220 },
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
    this.loseLife('Robot contact detected.');
  }

  private loseLife(reason: string): void {
    if (this.transitioning || this.player.isInvulnerable()) {
      return;
    }

    const previousLives = getRunState().lives;
    const remainingLives = loseRunStateLife();
    devLog('Level1Scene:loseLife', {
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
    this.time.delayedCall(160, () => {
      this.scene.restart({ fromDeath: true });
    });
  }

  private tryAdvanceToLevel2(): void {
    if (this.transitioning) {
      return;
    }

    const parts = getRunState().partsCollected;
    if (parts < LEVEL1_PARTS_REQUIRED) {
      this.statusText.setText('Gate locked. Collect more parts first.');
      return;
    }

    this.transitioning = true;
    setLevel(2);
    devLog('Level1Scene:transition Level1 -> Level2', {
      activeScenes: activeSceneKeys(this),
    });
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.time.delayedCall(280, () => {
      this.safeSceneStart('Level2Scene');
    });
  }

  private handleOutOfLives(): void {
    this.transitioning = true;
    this.pausedByUser = false;
    this.physics.world.resume();
    this.time.timeScale = 1;
    devLog('Level1Scene:transitionToMenuAfterGameOver', {
      activeScenes: activeSceneKeys(this),
    });
    this.statusText.setText('Out of lives! Restarting Level 1...');
    restartLevelFromBeginning(1);
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

  private safeSceneStart(nextKey: string): void {
    const active = activeSceneKeys(this);
    devLog('Level1Scene:safeSceneStart', {
      nextKey,
      activeScenes: active,
    });
    this.time.delayedCall(0, () => {
      this.scene.start(nextKey);
    });
  }
}
