import Phaser from 'phaser';

export class Robot extends Phaser.Physics.Arcade.Sprite {
  private readonly patrolMinX: number;
  private readonly patrolMaxX: number;
  private readonly patrolSpeed: number;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    patrolMinX: number,
    patrolMaxX: number,
    patrolSpeed = 70,
  ) {
    super(scene, x, y, 'robot');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.patrolMinX = patrolMinX;
    this.patrolMaxX = patrolMaxX;
    this.patrolSpeed = patrolSpeed;

    this.setDepth(8);
    this.setVelocityX(this.patrolSpeed);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.8, this.height * 0.9);
    body.setOffset(this.width * 0.1, this.height * 0.1);
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
  }
}
