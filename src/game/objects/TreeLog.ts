import Phaser from 'phaser';

export class TreeLog extends Phaser.Physics.Arcade.Image {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'tree_log');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setDepth(7);

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(this.width * 0.9, this.height * 0.72);
    body.setOffset(this.width * 0.05, this.height * 0.14);
  }

  public collect(): void {
    this.disableBody(true, true);
  }
}
