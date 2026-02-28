import Phaser from 'phaser';
import { SUPER_JUMP_MULTIPLIER } from '../config';
import { createControls, type Controls } from '../input/controls';
import { Carrot } from '../objects/Carrot';
import { Collectible } from '../objects/Collectible';
import { Mango } from '../objects/Mango';
import { Monkey } from '../objects/Monkey';
import { Player } from '../objects/Player';
import { Robot } from '../objects/Robot';
import { RocketGoal } from '../objects/RocketGoal';
import { SuperJumpItem } from '../objects/SuperJumpItem';
import { TreeLog } from '../objects/TreeLog';
import { activeSceneKeys, devLog, devSceneLifecycle } from '../utils/devLog';
import {
  addLife,
  enableSuperJump,
  getRunState,
  loseLives as loseRunStateLives,
  restartLevelFromBeginning,
  resetPowerupsForLevel,
  setLevel,
} from '../utils/runState';

interface Level4Data {
  fromDeath?: boolean;
  fromOutOfLives?: boolean;
}

export class Level4Scene extends Phaser.Scene {
  private player!: Player;
  private controls!: Controls;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private branchPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private robots!: Phaser.GameObjects.Group;
  private monkeys!: Phaser.GameObjects.Group;
  private levelParts!: Phaser.Physics.Arcade.Group;
  private logs!: Phaser.Physics.Arcade.StaticGroup;
  private mangos!: Phaser.Physics.Arcade.Group;
  private carrots!: Phaser.Physics.Arcade.Group;
  private rocket!: RocketGoal;
  private superJumpItem?: SuperJumpItem;
  private recoverySuperJumpItem?: SuperJumpItem;
  private statusText!: Phaser.GameObjects.Text;
  private pauseText!: Phaser.GameObjects.Text;
  private pollenEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private transitioning = false;
  private pausedByUser = false;
  private levelPartsCollected = 0;
  private logsCollected = 0;
  private readonly levelPartsTarget = 3;
  private readonly logsTarget = 1;
  private readonly mangoPowerDurationMs = 9000;
  private mangoPowerUntil = 0;
  private starCollected = false;

  public constructor() {
    super('Level4Scene');
  }

  public create(data: Level4Data): void {
    devSceneLifecycle(this, 'create');
    this.transitioning = false;
    this.pausedByUser = false;
    this.levelPartsCollected = 0;
    this.logsCollected = 0;
    this.mangoPowerUntil = 0;
    this.starCollected = false;
    this.physics.world.resume();
    this.time.timeScale = 1;
    setLevel(4);
    this.registry.set('hudObjective', '');
    resetPowerupsForLevel();

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }

    const worldWidth = 3300;
    const worldHeight = this.scale.height;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor('#102519');
    this.addForestBackdrop(worldWidth, worldHeight);

    this.platforms = this.physics.add.staticGroup();
    this.branchPlatforms = this.physics.add.staticGroup();
    this.buildTerrain(worldWidth, worldHeight);

    this.player = new Player(this, 130, 430);
    this.player.setSpawnPoint(130, 430);
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.branchPlatforms);

    this.robots = this.add.group({ runChildUpdate: true });
    this.spawnRobot(1260, 420, 1140, 1390, 78);
    this.spawnRobot(2480, 420, 2360, 2610, 90);

    this.monkeys = this.add.group({ runChildUpdate: true });
    this.spawnMonkey(1690, 206, 1600, 1860, 72);
    this.spawnMonkey(2520, 166, 2420, 2680, 74);
    this.spawnMonkey(2970, 126, 2880, 3110, 74);

    this.levelParts = this.physics.add.group();
    this.spawnParts();
    this.logs = this.physics.add.staticGroup();
    this.spawnLogs();
    this.mangos = this.physics.add.group();
    this.spawnMangos();
    this.carrots = this.physics.add.group();
    this.spawnCarrots();

    this.superJumpItem = new SuperJumpItem(this, 250, 472);
    this.recoverySuperJumpItem = new SuperJumpItem(this, 2140, 472);
    this.rocket = new RocketGoal(this, worldWidth - 110, 94);

    this.physics.add.overlap(this.player, this.levelParts, (_player, part) => {
      this.collectPart(part as Collectible);
    });
    this.physics.add.overlap(this.player, this.logs, (_player, log) => {
      this.collectLog(log as TreeLog);
    });
    this.physics.add.overlap(this.player, this.mangos, (_player, mango) => {
      this.collectMango(mango as Mango);
    });
    this.physics.add.overlap(this.player, this.carrots, (_player, carrot) => {
      this.collectCarrot(carrot as Carrot);
    });
    this.physics.add.overlap(this.player, this.robots, () => this.handleRobotHit());
    this.physics.add.overlap(this.player, this.monkeys, () => this.handleMonkeyHit());
    this.physics.add.overlap(this.player, this.rocket, () => this.tryFinishRun());
    if (this.superJumpItem) {
      this.physics.add.overlap(this.player, this.superJumpItem, () =>
        this.collectSuperJumpItem(this.superJumpItem, 'Super Jump unlocked! Use the early WAY UP path.'),
      );
    }
    if (this.recoverySuperJumpItem) {
      this.physics.add.overlap(this.player, this.recoverySuperJumpItem, () =>
        this.collectSuperJumpItem(
          this.recoverySuperJumpItem,
          'STAR = WAY UP! Use the recovery climb route.',
        ),
      );
    }

    this.controls = createControls(this);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.statusText = this.add
      .text(this.scale.width / 2, 88, '', {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#e7ffe8',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2001);

    this.pauseText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Paused', {
        fontFamily: 'Verdana',
        fontSize: '46px',
        color: '#ffffff',
        stroke: '#1d3f25',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2100)
      .setVisible(false);

    this.updateObjectiveHud();
    this.addWayUpMarkers();
    if (data.fromDeath) {
      this.statusText.setText('Try again. Collect 3 parts and 1 log.');
    } else if (data.fromOutOfLives) {
      this.statusText.setText('Out of lives. Level 4 restarted with 5 lives.');
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      devSceneLifecycle(this, 'shutdown');
      this.controls?.destroy();
      this.pollenEmitter?.stop();
      this.registry.set('hudObjective', '');
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

    if (this.player.y > this.scale.height + 80) {
      this.loseLives('Fell from the canopy.', 1, 750);
    }

    const rocketReady = this.hasObjectivesForRocket();
    this.rocket.setActivated(rocketReady);

    const mangoPowerActive = this.time.now < this.mangoPowerUntil;
    const mangoSeconds = Math.max(0, Math.ceil((this.mangoPowerUntil - this.time.now) / 1000));

    if (rocketReady) {
      this.statusText.setText(
        mangoPowerActive
          ? `MANGO POWER! ${mangoSeconds}s. Rocket ready.`
          : 'Objectives complete. Reach the rocket!',
      );
      return;
    }

    const partsNeeded = Math.max(0, this.levelPartsTarget - this.levelPartsCollected);
    const logsNeeded = Math.max(0, this.logsTarget - this.logsCollected);
    this.statusText.setText(
      this.starCollected
        ? mangoPowerActive
          ? `MANGO POWER! ${mangoSeconds}s. Need P:${partsNeeded} L:${logsNeeded}.`
          : `Collect Parts:${partsNeeded} and Logs:${logsNeeded}.`
        : 'Grab a Star for WAY UP!',
    );
  }

  private hasObjectivesForRocket(): boolean {
    return this.levelPartsCollected >= this.levelPartsTarget && this.logsCollected >= this.logsTarget;
  }

  private updateObjectiveHud(): void {
    this.registry.set(
      'hudObjective',
      `P: ${Math.min(this.levelPartsCollected, this.levelPartsTarget)}/${this.levelPartsTarget}  L: ${Math.min(this.logsCollected, this.logsTarget)}/${this.logsTarget}`,
    );
  }

  private addForestBackdrop(worldWidth: number, worldHeight: number): void {
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1f4d3a, 0x1f4d3a, 0x0d2318, 0x132d1f, 1);
    sky.fillRect(0, 0, worldWidth, worldHeight);
    sky.setDepth(-22);

    const farTrees = this.add.graphics();
    farTrees.fillStyle(0x0f2a1d, 0.9);
    for (let x = -120; x < worldWidth + 220; x += 170) {
      farTrees.fillTriangle(x, worldHeight - 70, x + 90, Phaser.Math.Between(200, 280), x + 180, worldHeight - 70);
    }
    farTrees.setDepth(-20);

    const trunks = this.add.graphics();
    trunks.fillStyle(0x3d2a1f, 0.92);
    for (let x = 120; x < worldWidth; x += 280) {
      const h = Phaser.Math.Between(120, 190);
      trunks.fillRoundedRect(x, worldHeight - (h + 78), 22, h, 4);
      trunks.fillStyle(0x2a1c14, 0.94);
      trunks.fillRoundedRect(x + 8, worldHeight - (h + 78), 4, h, 3);
      trunks.fillStyle(0x3d2a1f, 0.92);
      trunks.fillEllipse(x + 11, worldHeight - (h + 92), Phaser.Math.Between(92, 130), Phaser.Math.Between(60, 80));
    }
    trunks.setDepth(-16);

    this.pollenEmitter = this.add.particles(0, 0, 'pollen_dot', {
      x: { min: 0, max: worldWidth },
      y: { min: 20, max: worldHeight - 140 },
      speedY: { min: -9, max: 7 },
      speedX: { min: -11, max: 11 },
      lifespan: 2600,
      alpha: { start: 0.32, end: 0 },
      scale: { start: 1, end: 0.4 },
      frequency: 180,
      quantity: 1,
      blendMode: 'NORMAL',
    });
    this.pollenEmitter.setDepth(-15);
  }

  private buildTerrain(worldWidth: number, worldHeight: number): void {
    for (let x = 160; x < worldWidth; x += 320) {
      this.createPlatform(this.platforms, x, worldHeight - 14, 320, 28, 'platform');
    }

    this.createPlatform(this.platforms, 450, 486, 180, 20, 'platform');
    this.createPlatform(this.platforms, 610, 452, 170, 20, 'platform');
    this.createPlatform(this.platforms, 770, 418, 170, 20, 'platform');
    this.createPlatform(this.branchPlatforms, 930, 382, 190, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 1090, 348, 210, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 1250, 308, 210, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 1420, 270, 220, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 1700, 232, 240, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 1980, 260, 340, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 2230, 398, 170, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 2360, 356, 170, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 2490, 318, 170, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 2620, 280, 180, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 2750, 244, 200, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 2890, 212, 220, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 3030, 186, 260, 20, 'branch');
    this.createPlatform(this.branchPlatforms, 3170, 148, 200, 20, 'branch');
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

  private spawnParts(): void {
    const positions = [
      { x: 420, y: 438 },
      { x: 910, y: 358 },
      { x: 1240, y: 268 },
      { x: 1980, y: 220 },
      { x: 2620, y: 154 },
    ];
    positions.forEach((position) => {
      const part = new Collectible(this, position.x, position.y);
      this.levelParts.add(part);
    });
  }

  private spawnLogs(): void {
    const positions = [
      { x: 260, y: 500 },
      { x: 980, y: 360 },
      { x: 1990, y: 228 },
    ];
    positions.forEach((position) => {
      const log = new TreeLog(this, position.x, position.y);
      this.logs.add(log);
    });
  }

  private spawnMangos(): void {
    const positions = [
      { x: 520, y: 470 },
      { x: 980, y: 314 },
      { x: 1760, y: 206 },
      { x: 2480, y: 164 },
    ];
    positions.forEach((position) => {
      const mango = new Mango(this, position.x, position.y);
      this.mangos.add(mango);
    });
  }

  private spawnCarrots(): void {
    const positions = [
      { x: 780, y: 462 },
      { x: 2260, y: 372 },
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
    this.physics.add.collider(robot, this.branchPlatforms);
  }

  private spawnMonkey(
    x: number,
    y: number,
    minX: number,
    maxX: number,
    speed: number,
  ): void {
    const monkey = new Monkey(this, x, y, minX, maxX, speed);
    this.monkeys.add(monkey);
  }

  private collectPart(part: Collectible): void {
    if (!part.active || this.transitioning) {
      return;
    }

    part.collect();
    this.levelPartsCollected += 1;
    this.updateObjectiveHud();
  }

  private collectLog(log: TreeLog): void {
    if (!log.active || this.transitioning) {
      return;
    }

    log.collect();
    this.logsCollected += 1;
    this.updateObjectiveHud();
  }

  private collectMango(mango: Mango): void {
    if (!mango.active || this.transitioning) {
      return;
    }

    const previousLives = getRunState().lives;
    const nextLives = addLife(1);
    mango.collect();
    this.mangoPowerUntil = this.time.now + this.mangoPowerDurationMs;
    this.player.grantInvulnerability(this.mangoPowerDurationMs);
    this.cameras.main.flash(120, 236, 255, 179);
    this.statusText.setText(
      nextLives > previousLives
        ? 'MANGO POWER! +1 life and monkey-safe boost.'
        : 'MANGO POWER! Invulnerability refreshed.',
    );
  }

  private collectSuperJumpItem(item: SuperJumpItem | undefined, message: string): void {
    if (!item || !item.active || this.transitioning) {
      return;
    }

    item.collect();
    this.starCollected = true;
    enableSuperJump(SUPER_JUMP_MULTIPLIER);
    this.cameras.main.flash(150, 255, 220, 95);
    this.statusText.setText(message);
  }

  private addWayUpMarkers(): void {
    const earlyMarker = this.add
      .text(600, 474, 'WAY UP ->', {
        fontFamily: 'Verdana',
        fontSize: '18px',
        color: '#fff7a8',
        stroke: '#30512b',
        strokeThickness: 3,
      })
      .setDepth(16);

    const recoveryMarker = this.add
      .text(2080, 474, 'STAR = WAY UP!', {
        fontFamily: 'Verdana',
        fontSize: '18px',
        color: '#ffe8a3',
        stroke: '#2d4f28',
        strokeThickness: 3,
      })
      .setDepth(16);

    this.tweens.add({
      targets: [earlyMarker, recoveryMarker],
      alpha: 0.35,
      yoyo: true,
      repeat: -1,
      duration: 760,
      ease: 'Sine.easeInOut',
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

  private handleRobotHit(): void {
    this.loseLives('Robot guard impact.', 1, 750);
  }

  private handleMonkeyHit(): void {
    this.loseLives('Monkey swipe! -2 lives.', 2, 900);
  }

  private loseLives(reason: string, amount: number, invulnerabilityMs: number): void {
    if (this.transitioning || this.player.isInvulnerable()) {
      return;
    }

    const previousLives = getRunState().lives;
    const remainingLives = loseRunStateLives(amount);
    devLog('Level4Scene:loseLives', {
      reason,
      amount,
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
    this.player.grantInvulnerability(invulnerabilityMs);
    this.cameras.main.flash(150, 255, 130, 100);
    this.statusText.setText(reason);
    this.time.delayedCall(180, () => {
      this.scene.restart({ fromDeath: true });
    });
  }

  private tryFinishRun(): void {
    if (this.transitioning) {
      return;
    }

    if (!this.rocket.isActivated()) {
      const partsNeeded = Math.max(0, this.levelPartsTarget - this.levelPartsCollected);
      const logsNeeded = Math.max(0, this.logsTarget - this.logsCollected);
      this.statusText.setText(`Need Parts:${partsNeeded} Logs:${logsNeeded} for launch.`);
      return;
    }

    this.transitioning = true;
    devLog('Level4Scene:transition Level4 -> Win', {
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
    this.statusText.setText('Out of lives! Restarting Level 4...');
    restartLevelFromBeginning(4);
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
    devLog('Level4Scene:safeSceneStart', {
      nextKey,
      activeScenes: active,
    });
    this.time.delayedCall(0, () => {
      this.scene.start(nextKey);
    });
  }
}
