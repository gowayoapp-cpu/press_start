import Phaser from 'phaser';
import { TOTAL_PARTS_REQUIRED } from '../config';
import { devLog } from '../utils/devLog';
import { resetRunState } from '../utils/runState';

export class WinScene extends Phaser.Scene {
  public constructor() {
    super('WinScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#081f1a');
    this.add
      .text(this.scale.width / 2, 120, 'You Escaped!', {
        fontFamily: 'Verdana',
        fontSize: '60px',
        color: '#d2ffe0',
        stroke: '#12382a',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.scale.width / 2,
        220,
        `Rabbit Boy collected all ${TOTAL_PARTS_REQUIRED} cosmic parts\nand launched the rocket home.`,
        {
          fontFamily: 'Verdana',
          fontSize: '25px',
          color: '#ecfff2',
          align: 'center',
          lineSpacing: 7,
        },
      )
      .setOrigin(0.5);

    const playAgain = this.makeButton(this.scale.width / 2, 340, 'Play Again');
    playAgain.on('pointerup', () => this.playAgain());

    const menu = this.makeButton(this.scale.width / 2, 430, 'Back to Menu');
    menu.on('pointerup', () => {
      resetRunState();
      this.scene.start('MenuScene');
    });

    this.input.keyboard?.once('keydown-SPACE', () => this.playAgain());
    this.input.keyboard?.once('keydown-ENTER', () => this.playAgain());
  }

  private playAgain(): void {
    devLog('WinScene:playAgain');
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
      .rectangle(x, y, 280, 66, 0x2ca770, 0.92)
      .setStrokeStyle(2, 0xdaffec, 0.95)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Verdana',
        fontSize: '28px',
        color: '#f0fff7',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => {
      button.setFillStyle(0x46bf88, 1);
      text.setScale(1.03);
    });
    button.on('pointerout', () => {
      button.setFillStyle(0x2ca770, 0.92);
      text.setScale(1);
    });

    return button;
  }
}
