import Phaser from 'phaser';

export class Mango extends Phaser.Physics.Arcade.Image {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'mango');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(8);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.immovable = true;
    body.setCircle(this.width * 0.34, this.width * 0.16, this.height * 0.16);

    scene.tweens.add({
      targets: this,
      y: y - 5,
      duration: 760,
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
