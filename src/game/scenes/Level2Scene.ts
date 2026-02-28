import Phaser from 'phaser';
import { INITIAL_LIVES, TOTAL_PARTS_REQUIRED } from '../config';
import { createControls, type Controls } from '../input/controls';
import { Collectible } from '../objects/Collectible';
import { Player } from '../objects/Player';
import { RocketGoal } from '../objects/RocketGoal';
import { Robot } from '../objects/Robot';

export class Level2Scene extends Phaser.Scene {
  private player!: Player;
  private controls!: Controls;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private icePlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private robots!: Phaser.GameObjects.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private rocket!: RocketGoal;
  private statusText!: Phaser.GameObjects.Text;
  private transitioning = false;

  public constructor() {
    super('Level2Scene');
  }

  public create(): void {
    this.transitioning = false;

    const worldWidth = 2700;
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
    this.spawnRobot(860, 414, 720, 980, 74);
    this.spawnRobot(1440, 286, 1340, 1580, 65);
    this.spawnRobot(2100, 334, 1980, 2240, 82);
    this.spawnRobot(2460, 436, 2320, 2580, 90);

    this.collectibles = this.physics.add.group();
    this.spawnCollectibles();

    this.rocket = new RocketGoal(this, worldWidth - 98, worldHeight - 120);

    this.physics.add.overlap(
      this.player,
      this.collectibles,
      (_player, collectible) => {
        this.collectPart(collectible as Collectible);
      },
    );
    this.physics.add.overlap(this.player, this.robots, () => this.handleRobotCollision());
    this.physics.add.overlap(this.player, this.rocket, () => this.tryLaunchRocket());

    this.controls = createControls(this);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.statusText = this.add
      .text(this.scale.width / 2, 62, '', {
        fontFamily: 'Verdana',
        fontSize: '20px',
        color: '#d6ebff',
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

    const onIce = this.isPlayerOnIce();
    const controlsState = this.controls.getState();
    this.player.move(controlsState.horizontal, onIce);
    if (controlsState.jumpJustPressed) {
      this.player.jump();
    }

    if (this.player.y > this.scale.height + 140) {
      this.loseLife('Lost in the ice fields.');
    }

    const parts = this.getParts();
    const rocketReady = parts >= TOTAL_PARTS_REQUIRED;
    this.rocket.setActivated(rocketReady);

    this.statusText.setText(
      rocketReady
        ? 'Rocket online. Reach it to win!'
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
    this.createPlatform(this.icePlatforms, 880, 360, 300, 24, 'ice');
    this.createPlatform(this.platforms, 1200, 308, 220, 24, 'platform');
    this.createPlatform(this.icePlatforms, 1530, 260, 320, 24, 'ice');
    this.createPlatform(this.platforms, 1900, 340, 260, 24, 'platform');
    this.createPlatform(this.icePlatforms, 2230, 456, 320, 24, 'ice');
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
      { x: 900, y: 324 },
      { x: 1510, y: 226 },
      { x: 1960, y: 306 },
      { x: 2340, y: 420 },
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
    this.physics.add.collider(robot, this.icePlatforms);
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
    this.loseLife('Robot strike. Systems unstable.');
  }

  private loseLife(reason: string): void {
    if (this.transitioning || this.player.isInvulnerable()) {
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

  private tryLaunchRocket(): void {
    if (this.transitioning) {
      return;
    }
    if (!this.rocket.isActivated()) {
      this.statusText.setText(
        `Rocket needs ${TOTAL_PARTS_REQUIRED - this.getParts()} more part(s).`,
      );
      return;
    }

    this.transitioning = true;
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.time.delayedCall(280, () => {
      if (this.scene.isActive('UIScene')) {
        this.scene.stop('UIScene');
      }
      this.scene.start('WinScene');
    });
  }

  private transitionToGameOver(): void {
    this.transitioning = true;
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.start('GameOverScene');
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

  private getLives(): number {
    return (this.registry.get('lives') as number | undefined) ?? INITIAL_LIVES;
  }

  private getParts(): number {
    return (this.registry.get('parts') as number | undefined) ?? 0;
  }
}
