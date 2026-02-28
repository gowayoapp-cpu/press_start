import Phaser from 'phaser';
import { TOTAL_PARTS_REQUIRED } from '../config';
import { getRunState, subscribeRunState, type RunState } from '../utils/runState';

export class UIScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Rectangle;
  private livesText!: Phaser.GameObjects.Text;
  private partsText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private unsubscribeRunState?: () => void;

  public constructor() {
    super('UIScene');
  }

  public create(): void {
    this.panel = this.add
      .rectangle(0, 0, this.scale.width, 56, 0x000000, 0.4)
      .setOrigin(0)
      .setScrollFactor(0);

    this.livesText = this.add
      .text(0, 0, '', {
        fontFamily: 'Verdana',
        fontSize: '21px',
        color: '#ffffff',
      })
      .setScrollFactor(0);

    this.partsText = this.add
      .text(0, 0, '', {
        fontFamily: 'Verdana',
        fontSize: '21px',
        color: '#ffe18f',
      })
      .setScrollFactor(0);

    this.levelText = this.add
      .text(0, 0, '', {
        fontFamily: 'Verdana',
        fontSize: '18px',
        color: '#b9d7ff',
      })
      .setScrollFactor(0)
      .setOrigin(1, 0);

    const align = () => {
      const width = this.scale.width;
      const margin = Math.max(12, Math.round(width * 0.014));
      const fontSize = width <= 480 ? '16px' : '21px';

      this.panel.setSize(width, width <= 480 ? 52 : 56);
      this.livesText.setFontSize(fontSize).setPosition(margin, 12);
      this.partsText.setFontSize(fontSize).setPosition(margin + 160, 12);
      this.levelText
        .setFontSize(width <= 480 ? '15px' : '18px')
        .setPosition(width - margin, 14);
    };

    align();
    this.scale.on(Phaser.Scale.Events.RESIZE, align);

    this.refresh(getRunState());
    this.unsubscribeRunState = subscribeRunState((next) => this.refresh(next));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, align);
      this.unsubscribeRunState?.();
      this.unsubscribeRunState = undefined;
    });
  }

  private refresh(runState: RunState): void {
    this.livesText.setText(`Lives: ${runState.lives}`);
    this.partsText.setText(
      `Cosmic Parts: ${runState.partsCollected}/${TOTAL_PARTS_REQUIRED}`,
    );
    this.levelText.setText(`Level ${runState.currentLevel}`);
  }
}
