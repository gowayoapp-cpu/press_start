import Phaser from 'phaser';

export class TreeLog extends Phaser.Physics.Arcade.Image {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'tree_log');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(7);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.immovable = true;
    body.setSize(this.width * 0.9, this.height * 0.72);
    body.setOffset(this.width * 0.05, this.height * 0.14);

    scene.tweens.add({
      targets: this,
      y: y - 4,
      duration: 920,
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
