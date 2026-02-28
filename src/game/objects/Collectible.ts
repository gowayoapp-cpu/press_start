import Phaser from 'phaser';

export class Collectible extends Phaser.Physics.Arcade.Image {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'part');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(7);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.immovable = true;
    body.setCircle(this.width * 0.35, this.width * 0.15, this.height * 0.15);

    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 900,
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
