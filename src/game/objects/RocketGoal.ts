import Phaser from 'phaser';

export class RocketGoal extends Phaser.Physics.Arcade.Sprite {
  private activated = false;
  private pulseTween?: Phaser.Tweens.Tween;

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'rocket_off');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(9);
  }

  public setActivated(nextState: boolean): void {
    if (this.activated === nextState) {
      return;
    }

    this.activated = nextState;
    this.setTexture(this.activated ? 'rocket_on' : 'rocket_off');

    if (this.activated) {
      this.pulseTween?.stop();
      this.pulseTween = this.scene.tweens.add({
        targets: this,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 450,
        yoyo: true,
        repeat: -1,
      });
      return;
    }

    this.pulseTween?.stop();
    this.pulseTween = undefined;
    this.setScale(1);
  }

  public isActivated(): boolean {
    return this.activated;
  }
}
