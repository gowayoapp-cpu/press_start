import Phaser from 'phaser';
import { devLog } from '../utils/devLog';
import { getRunState, resetRunState } from '../utils/runState';

export class GameOverScene extends Phaser.Scene {
  public constructor() {
    super('GameOverScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#180d14');
    this.add
      .text(this.scale.width / 2, 140, 'Mission Failed', {
        fontFamily: 'Verdana',
        fontSize: '56px',
        color: '#ffd0dc',
        stroke: '#3c0f22',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const partsCollected = getRunState().partsCollected;
    this.add
      .text(this.scale.width / 2, 235, `Parts Collected: ${partsCollected}`, {
        fontFamily: 'Verdana',
        fontSize: '26px',
        color: '#ffecf1',
      })
      .setOrigin(0.5);

    const retry = this.makeButton(this.scale.width / 2, 340, 'Retry');
    retry.on('pointerup', () => this.retryRun());

    const menu = this.makeButton(this.scale.width / 2, 430, 'Back to Menu');
    menu.on('pointerup', () => {
      resetRunState();
      this.scene.start('MenuScene');
    });

    this.input.keyboard?.once('keydown-SPACE', () => this.retryRun());
    this.input.keyboard?.once('keydown-ENTER', () => this.retryRun());
  }

  private retryRun(): void {
    devLog('GameOverScene:retryRun');
    resetRunState();
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
    this.scene.start('Level1Scene', { resetProgress: true });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
  ): Phaser.GameObjects.Rectangle {
    const button = this.add
      .rectangle(x, y, 280, 66, 0xc03667, 0.92)
      .setStrokeStyle(2, 0xffd9e7, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Verdana',
        fontSize: '28px',
        color: '#fff8fa',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => {
      button.setFillStyle(0xe0427b, 1);
      text.setScale(1.03);
    });
    button.on('pointerout', () => {
      button.setFillStyle(0xc03667, 0.92);
      text.setScale(1);
    });

    return button;
  }
}
