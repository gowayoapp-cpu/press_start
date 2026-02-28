import Phaser from 'phaser';

export class FloatingRobot extends Phaser.Physics.Arcade.Sprite {
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
    patrolSpeed = 90,
  ) {
    super(scene, x, y, 'floating_robot');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.patrolMinX = patrolMinX;
    this.patrolMaxX = patrolMaxX;
    this.patrolSpeed = patrolSpeed;
    this.baseY = y;
    this.bobAmplitude = 12;
    this.bobSpeed = Phaser.Math.FloatBetween(0.0026, 0.0034);

    this.setDepth(10);
    this.setVelocityX(this.patrolSpeed);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.immovable = true;
    body.setSize(this.width * 0.8, this.height * 0.78);
    body.setOffset(this.width * 0.1, this.height * 0.12);
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

    this.setFlipX(body.velocity.x < 0);
    this.y = this.baseY + Math.sin(time * this.bobSpeed) * this.bobAmplitude;
  }
}
