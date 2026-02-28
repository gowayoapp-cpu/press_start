import Phaser from 'phaser';

export class Monkey extends Phaser.Physics.Arcade.Sprite {
  private readonly patrolMinX: number;
  private readonly patrolMaxX: number;
  private readonly patrolSpeed: number;
  private readonly baseY: number;
  private readonly bobAmplitude: number;
  private readonly bobSpeed: number;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    patrolMinX: number,
    patrolMaxX: number,
    patrolSpeed = 72,
  ) {
    super(scene, x, y, 'monkey');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.patrolMinX = patrolMinX;
    this.patrolMaxX = patrolMaxX;
    this.patrolSpeed = patrolSpeed;
    this.baseY = y;
    this.bobAmplitude = 5;
    this.bobSpeed = Phaser.Math.FloatBetween(0.003, 0.0038);

    this.setDepth(10);
    this.setVelocityX(this.patrolSpeed);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.immovable = true;
    body.setSize(this.width * 0.78, this.height * 0.8);
    body.setOffset(this.width * 0.11, this.height * 0.1);
  }

  public preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.x <= this.patrolMinX && body.velocity.x < 0) {
      this.setVelocityX(this.patrolSpeed);
    }
    if (this.x >= this.patrolMaxX && body.velocity.x > 0) {
      this.setVelocityX(-this.patrolSpeed);
    }

    this.setFlipX(body.velocity.x > 0);
    this.y = this.baseY + Math.sin(time * this.bobSpeed) * this.bobAmplitude;
  }
}
