import Phaser from 'phaser';
import {
  INITIAL_LIVES,
  LEVEL1_PARTS_REQUIRED,
  TOTAL_PARTS_REQUIRED,
} from '../config';
import { createControls, type Controls } from '../input/controls';
import { Collectible } from '../objects/Collectible';
import { Player } from '../objects/Player';
import { Robot } from '../objects/Robot';

interface Level1Data {
  resetProgress?: boolean;
}

export class Level1Scene extends Phaser.Scene {
  private player!: Player;
  private controls!: Controls;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private robots!: Phaser.GameObjects.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private exitGate!: Phaser.Physics.Arcade.Sprite;
  private statusText!: Phaser.GameObjects.Text;
  private transitioning = false;

  public constructor() {
    super('Level1Scene');
  }

  public create(data: Level1Data): void {
    this.transitioning = false;

    if (data.resetProgress) {
      this.registry.set('lives', INITIAL_LIVES);
      this.registry.set('parts', 0);
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

    this.exitGate = this.physics.add
      .staticSprite(worldWidth - 120, worldHeight - 102, 'gate_closed')
      .setDepth(9);

    this.physics.add.overlap(
      this.player,
      this.collectibles,
      (_player, collectible) => {
        this.collectPart(collectible as Collectible);
      },
    );
    this.physics.add.overlap(this.player, this.robots, () => this.handleRobotCollision());
    this.physics.add.overlap(this.player, this.exitGate, () => this.tryAdvanceToLevel2());

    this.controls = createControls(this);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.statusText = this.add
      .text(this.scale.width / 2, 62, '', {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#e3ecff',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2001);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controls.destroy();
      this.player.clearInvulnerabilityVisuals();
    });
  }

  public update(): void {
    if (this.transitioning) {
      return;
    }

    const controlsState = this.controls.getState();
    this.player.move(controlsState.horizontal, false);
    if (controlsState.jumpJustPressed) {
      this.player.jump();
    }

    if (this.player.y > this.scale.height + 140) {
      this.loseLife('The void took a life.');
    }

    const parts = this.getParts();
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
    if (!part.active) {
      return;
    }
    part.collect();
    const next = Math.min(this.getParts() + 1, TOTAL_PARTS_REQUIRED);
    this.registry.set('parts', next);
  }

  private handleRobotCollision(): void {
    this.loseLife('Robot contact detected.');
  }

  private loseLife(reason: string): void {
    if (this.player.isInvulnerable() || this.transitioning) {
      return;
    }

    const lives = this.getLives() - 1;
    this.registry.set('lives', lives);

    if (lives <= 0) {
      this.transitionToGameOver();
      return;
    }

    this.player.respawn();
    this.player.grantInvulnerability(1250);
    this.statusText.setText(reason);
  }

  private tryAdvanceToLevel2(): void {
    if (this.transitioning) {
      return;
    }

    if (this.getParts() < LEVEL1_PARTS_REQUIRED) {
      this.statusText.setText('Gate locked. Collect more parts first.');
      return;
    }

    this.transitioning = true;
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.time.delayedCall(280, () => {
      this.scene.start('Level2Scene');
    });
  }

  private transitionToGameOver(): void {
    this.transitioning = true;
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.start('GameOverScene');
  }

  private getLives(): number {
    return (this.registry.get('lives') as number | undefined) ?? INITIAL_LIVES;
  }

  private getParts(): number {
    return (this.registry.get('parts') as number | undefined) ?? 0;
  }
}
