import Phaser from 'phaser';

export class Carrot extends Phaser.Physics.Arcade.Image {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'carrot');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(7);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.immovable = true;
    body.setCircle(this.width * 0.34, this.width * 0.18, this.height * 0.18);

    scene.tweens.add({
      targets: this,
      y: y - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  public collect(): void {
    this.scene.tweens.killTweensOf(this);
    this.disableBody(true, true);
  }
}
