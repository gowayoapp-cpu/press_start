import Phaser from 'phaser';

export class SuperJumpItem extends Phaser.Physics.Arcade.Image {
  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'super_jump_item');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(12);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.immovable = true;
    body.setCircle(this.width * 0.36, this.width * 0.14, this.height * 0.14);

    scene.tweens.add({
      targets: this,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 360,
      yoyo: true,
      repeat: -1,
    });
  }

  public collect(): void {
    this.scene.tweens.killTweensOf(this);
    this.disableBody(true, true);
  }
}
