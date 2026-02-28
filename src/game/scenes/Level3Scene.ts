import Phaser from 'phaser';
import { SUPER_JUMP_MULTIPLIER } from '../config';
import { createControls, type Controls } from '../input/controls';
import { Carrot } from '../objects/Carrot';
import { Collectible } from '../objects/Collectible';
import { FloatingRobot } from '../objects/FloatingRobot';
import { Player } from '../objects/Player';
import { RocketGoal } from '../objects/RocketGoal';
import { SuperJumpItem } from '../objects/SuperJumpItem';
import { activeSceneKeys, devLog, devSceneLifecycle } from '../utils/devLog';
import {
  addLife,
  enableSuperJump,
  getRunState,
  loseLife as loseRunStateLife,
  restartLevelFromBeginning,
  resetPowerupsForLevel,
  setLevel,
} from '../utils/runState';

interface Level3Data {
  fromDeath?: boolean;
  fromOutOfLives?: boolean;
}

export class Level3Scene extends Phaser.Scene {
  private player!: Player;
  private controls!: Controls;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private lava!: Phaser.Physics.Arcade.StaticGroup;
  private lavaPools!: Phaser.Physics.Arcade.Group;
  private floatingGuards!: Phaser.GameObjects.Group;
  private carrots!: Phaser.Physics.Arcade.Group;
  private levelParts!: Phaser.Physics.Arcade.Group;
  private rocket!: RocketGoal;
  private superJumpItem?: SuperJumpItem;
  private statusText!: Phaser.GameObjects.Text;
  private pauseText!: Phaser.GameObjects.Text;
  private smokeEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lavaEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private transitioning = false;
  private pausedByUser = false;
  private levelPartsCollected = 0;
  private readonly levelPartsTarget = 4;

  public constructor() {
    super('Level3Scene');
  }

  public create(data: Level3Data): void {
    devSceneLifecycle(this, 'create');
    this.transitioning = false;
    this.pausedByUser = false;
    this.physics.world.resume();
    this.time.timeScale = 1;
    this.levelPartsCollected = 0;
    setLevel(3);
    resetPowerupsForLevel();

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    const worldWidth = 3200;
    const worldHeight = this.scale.height;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor('#1a0a08');

    this.addVolcanoBackdrop(worldWidth, worldHeight);

    this.platforms = this.physics.add.staticGroup();
    this.lava = this.physics.add.staticGroup();
    this.lavaPools = this.physics.add.group();
    this.buildTerrain(worldWidth, worldHeight);
    this.buildLava(worldWidth, worldHeight);

    this.player = new Player(this, 130, 380);
    this.player.setSpawnPoint(130, 380);
    this.physics.add.collider(this.player, this.platforms);

    this.floatingGuards = this.add.group({ runChildUpdate: true });
    this.spawnFloatingGuard(820, 285, 690, 980, 84);
    this.spawnFloatingGuard(1400, 245, 1270, 1560, 88);
    this.spawnFloatingGuard(2060, 190, 1920, 2230, 112);
    this.spawnFloatingGuard(2710, 145, 2580, 2850, 118);

    this.carrots = this.physics.add.group();
    this.spawnCarrots();
    this.levelParts = this.physics.add.group();
    this.spawnLevelParts();

    this.superJumpItem = new SuperJumpItem(this, 500, 362);
    this.rocket = new RocketGoal(this, worldWidth - 102, 98);

    this.physics.add.overlap(this.player, this.floatingGuards, () => this.handleEnemyHit());
    this.physics.add.overlap(this.player, this.lava, () => this.handleLavaHit());
    this.physics.add.overlap(this.player, this.lavaPools, () => this.handleLavaHit());
    this.physics.add.overlap(this.player, this.carrots, (_player, carrot) => {
      this.collectCarrot(carrot as Carrot);
    });
    this.physics.add.overlap(this.player, this.levelParts, (_player, part) => {
      this.collectLevelPart(part as Collectible);
    });
    this.physics.add.overlap(this.player, this.rocket, () => this.tryFinishGame());

    if (this.superJumpItem) {
      this.physics.add.overlap(this.player, this.superJumpItem, () => {
        this.collectSuperJumpItem();
      });
    }

    this.controls = createControls(this);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.statusText = this.add
      .text(this.scale.width / 2, 60, '', {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#ffe7d3',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2001);

    this.pauseText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Paused', {
        fontFamily: 'Verdana',
        fontSize: '46px',
        color: '#ffffff',
        stroke: '#3f130e',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2100)
      .setVisible(false);

    if (data.fromDeath) {
      this.statusText.setText('Respawned. Reclaim super jump to clear the ridge.');
    } else if (data.fromOutOfLives) {
      this.statusText.setText('Out of lives. Level restarted with 5 lives.');
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      devSceneLifecycle(this, 'shutdown');
      this.controls?.destroy();
      this.smokeEmitter?.stop();
      this.lavaEmitter?.stop();
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

    if (this.player.y > this.scale.height + 60) {
      this.loseLife('Melted in lava.');
    }

    const runState = getRunState();
    this.rocket.setActivated(this.levelPartsCollected >= this.levelPartsTarget);
    const remainingParts = Math.max(0, this.levelPartsTarget - this.levelPartsCollected);
    this.statusText.setText(
      this.rocket.isActivated()
        ? runState.superJumpActive
          ? 'Super Jump active. Rocket ready!'
          : 'Rocket ready. Reach the launch ridge.'
        : runState.superJumpActive
          ? `Super Jump active. Parts ${this.levelPartsCollected}/${this.levelPartsTarget}.`
          : `Collect ${remainingParts} more local part(s).`,
    );
  }

  private addVolcanoBackdrop(worldWidth: number, worldHeight: number): void {
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x2b0e0a, 0x2b0e0a, 0x120505, 0x130606, 1);
    sky.fillRect(0, 0, worldWidth, worldHeight);
    sky.setDepth(-20);

    const mountains = this.add.graphics();
    mountains.fillStyle(0x1b0a08, 0.95);
    mountains.fillTriangle(130, worldHeight - 60, 680, 130, 1220, worldHeight - 60);
    mountains.fillTriangle(1100, worldHeight - 60, 1660, 90, 2230, worldHeight - 60);
    mountains.fillTriangle(2050, worldHeight - 60, 2700, 120, 3320, worldHeight - 60);
    mountains.setDepth(-15);

    const craterGlow = this.add.graphics();
    craterGlow.fillStyle(0xf97316, 0.2);
    craterGlow.fillEllipse(1660, 95, 230, 72);
    craterGlow.fillStyle(0xfb923c, 0.18);
    craterGlow.fillEllipse(680, 132, 180, 58);
    craterGlow.setDepth(-14);

    this.smokeEmitter = this.add.particles(0, 0, 'smoke_dot', {
      x: { min: 610, max: 1770 },
      y: { min: 72, max: 130 },
      lifespan: 2000,
      speedY: { min: -24, max: -8 },
      speedX: { min: -9, max: 9 },
      scale: { start: 1, end: 2.4 },
      alpha: { start: 0.28, end: 0 },
      frequency: 120,
      quantity: 1,
      blendMode: 'NORMAL',
    });
    this.smokeEmitter.setDepth(-13);
  }

  private buildTerrain(worldWidth: number, worldHeight: number): void {
    for (let x = 140; x < worldWidth; x += 300) {
      this.createPlatform(this.platforms, x, worldHeight - 102, 210, 20, 'platform');
    }

    this.createPlatform(this.platforms, 340, 400, 250, 24, 'platform');
    this.createPlatform(this.platforms, 690, 350, 220, 24, 'platform');
    this.createPlatform(this.platforms, 1000, 315, 200, 24, 'platform');
    this.createPlatform(this.platforms, 1310, 282, 190, 24, 'platform');
    this.createPlatform(this.platforms, 1600, 254, 180, 24, 'platform');
    this.createPlatform(this.platforms, 1885, 216, 240, 24, 'platform');
    this.createPlatform(this.platforms, 2200, 258, 210, 24, 'platform');
    this.createPlatform(this.platforms, 2520, 205, 200, 24, 'platform');
    this.createPlatform(this.platforms, 2840, 168, 240, 24, 'platform');
    this.createPlatform(this.platforms, 3080, 132, 180, 24, 'platform');
  }

  private buildLava(worldWidth: number, worldHeight: number): void {
    for (let x = 160; x < worldWidth; x += 320) {
      this.createPlatform(this.lava, x, worldHeight - 10, 320, 24, 'lava');
    }

    this.spawnLavaPool(1180, 470, 110, 60);
    this.spawnLavaPool(1980, 432, 90, 65);
    this.spawnLavaPool(2630, 382, 80, 70);

    this.lavaEmitter = this.add.particles(0, 0, 'lava_bubble', {
      x: { min: 0, max: worldWidth },
      y: { min: worldHeight - 22, max: worldHeight - 10 },
      speedY: { min: -70, max: -30 },
      speedX: { min: -12, max: 12 },
      lifespan: 900,
      alpha: { start: 0.6, end: 0 },
      scale: { start: 0.55, end: 0.05 },
      frequency: 90,
      quantity: 1,
      blendMode: 'ADD',
    });
    this.lavaEmitter.setDepth(1);
  }

  private spawnLavaPool(x: number, y: number, moveX: number, durationOffset: number): void {
    const pool = this.physics.add.image(x, y, 'lava_pool');
    const body = pool.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.immovable = true;
    body.setSize(pool.width * 0.95, pool.height * 0.82);
    pool.setDepth(4);
    this.lavaPools.add(pool);

    this.tweens.add({
      targets: pool,
      x: x + moveX,
      duration: 2100 + durationOffset * 8,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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

  private spawnFloatingGuard(
    x: number,
    y: number,
    minX: number,
    maxX: number,
    speed: number,
  ): void {
    const guard = new FloatingRobot(this, x, y, minX, maxX, speed);
    this.floatingGuards.add(guard);
  }

  private spawnCarrots(): void {
    const positions = [
      { x: 400, y: 368 },
      { x: 2240, y: 222 },
      { x: 2900, y: 132 },
    ];
    positions.forEach((position) => {
      const carrot = new Carrot(this, position.x, position.y);
      this.carrots.add(carrot);
    });
  }

  private spawnLevelParts(): void {
    const positions = [
      { x: 320, y: 368 },
      { x: 560, y: 352 },
      { x: 930, y: 306 },
      { x: 1320, y: 266 },
    ];

    positions.forEach((position) => {
      const part = new Collectible(this, position.x, position.y);
      this.levelParts.add(part);
    });
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

  private collectSuperJumpItem(): void {
    if (!this.superJumpItem || !this.superJumpItem.active || this.transitioning) {
      return;
    }

    this.superJumpItem.collect();
    enableSuperJump(SUPER_JUMP_MULTIPLIER);
    this.cameras.main.flash(180, 255, 215, 70);
    this.statusText.setText('Super Jump unlocked!');
    devLog('Level3Scene:superJumpEnabled', {
      activeScenes: activeSceneKeys(this),
    });
  }

  private collectLevelPart(part: Collectible): void {
    if (!part.active || this.transitioning) {
      return;
    }

    part.collect();
    this.levelPartsCollected += 1;
    this.statusText.setText(
      `Level 3 parts: ${this.levelPartsCollected}/${this.levelPartsTarget}`,
    );
  }

  private handleEnemyHit(): void {
    this.loseLife('Floating guard impact.');
  }

  private handleLavaHit(): void {
    this.loseLife('Lava burn!');
  }

  private loseLife(reason: string): void {
    if (this.transitioning || this.player.isInvulnerable()) {
      return;
    }

    const previousLives = getRunState().lives;
    const remainingLives = loseRunStateLife();
    devLog('Level3Scene:loseLife', {
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
    this.cameras.main.flash(160, 255, 80, 40);
    this.statusText.setText(reason);
    this.time.delayedCall(170, () => {
      this.scene.restart({ fromDeath: true });
    });
  }

  private tryFinishGame(): void {
    if (this.transitioning) {
      return;
    }

    if (!this.rocket.isActivated()) {
      this.statusText.setText(
        `Rocket needs ${Math.max(0, this.levelPartsTarget - this.levelPartsCollected)} more local part(s).`,
      );
      return;
    }

    this.transitioning = true;
    devLog('Level3Scene:transition Level3 -> Win', {
      activeScenes: activeSceneKeys(this),
    });

    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.time.delayedCall(280, () => {
      if (this.scene.isActive('UIScene')) {
        this.scene.stop('UIScene');
      }
      this.safeSceneStart('WinScene');
    });
  }

  private handleOutOfLives(): void {
    this.transitioning = true;
    this.pausedByUser = false;
    this.physics.world.resume();
    this.time.timeScale = 1;
    devLog('Level3Scene:handleOutOfLives', {
      activeScenes: activeSceneKeys(this),
    });
    this.statusText.setText('Out of lives! Restarting Level 3...');
    restartLevelFromBeginning(3);
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
    devLog('Level3Scene:safeSceneStart', {
      nextKey,
      activeScenes: active,
    });
    this.time.delayedCall(0, () => {
      this.scene.start(nextKey);
    });
  }
}
