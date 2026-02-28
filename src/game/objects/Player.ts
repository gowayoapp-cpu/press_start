import Phaser from 'phaser';
import { getRunState } from '../utils/runState';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly spawnPoint = new Phaser.Math.Vector2();
  private invulnerableUntil = 0;

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0, 0);
    this.setDepth(10);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.7, this.height * 0.9);
    body.setOffset(this.width * 0.15, this.height * 0.1);

    this.setSpawnPoint(x, y);
  }

  public move(horizontal: number, onIce: boolean): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const acceleration = onIce ? 640 : 1850;
    const drag = onIce ? 180 : 2500;
    const maxSpeed = onIce ? 285 : 295;

    body.setMaxVelocity(maxSpeed, 900);
    body.setDragX(drag);

    if (horizontal === 0) {
      this.setAccelerationX(0);
      return;
    }

    this.setAccelerationX(horizontal * acceleration);
    this.setFlipX(horizontal < 0);
  }

  public jump(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;

    if (!grounded) {
      return false;
    }

    const jumpVelocity = -440 * getRunState().jumpMultiplier;
    this.setVelocityY(jumpVelocity);
    return true;
  }

  public setSpawnPoint(x: number, y: number): void {
    this.spawnPoint.set(x, y);
  }

  public respawn(): void {
    this.setPosition(this.spawnPoint.x, this.spawnPoint.y);
    this.setVelocity(0, 0);
  }

  public grantInvulnerability(durationMs: number): void {
    if (!this.scene || !this.scene.sys || !this.scene.time) {
      return;
    }

    this.invulnerableUntil = this.scene.time.now + durationMs;
    this.setAlpha(0.55);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.95,
      yoyo: true,
      repeat: -1,
      duration: 90,
    });
    this.scene.time.delayedCall(durationMs, () => {
      if (this.scene.time.now >= this.invulnerableUntil) {
        this.clearInvulnerabilityVisuals();
      }
    });
  }

  public isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  public clearInvulnerabilityVisuals(): void {
    const scene = this.scene;
    if (!scene || !scene.tweens || !scene.sys) {
      return;
    }

    scene.tweens.killTweensOf(this);
    if (this.active) {
      this.setAlpha(1);
    }
  }
}
