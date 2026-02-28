import Phaser from 'phaser';
import { TOTAL_PARTS_REQUIRED } from '../config';
import { getRunState, subscribeRunState, type RunState } from '../utils/runState';

export class UIScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Rectangle;
  private livesText!: Phaser.GameObjects.Text;
  private partsText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private superJumpText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private objectiveHint = '';
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
    this.superJumpText = this.add
      .text(0, 0, '', {
        fontFamily: 'Verdana',
        fontSize: '14px',
        color: '#fde68a',
      })
      .setScrollFactor(0)
      .setOrigin(1, 0);
    this.objectiveText = this.add
      .text(0, 0, '', {
        fontFamily: 'Verdana',
        fontSize: '14px',
        color: '#d8f7d8',
      })
      .setScrollFactor(0)
      .setOrigin(0.5, 0);

    const align = () => {
      const width = this.scale.width;
      const margin = Math.max(12, Math.round(width * 0.014));
      const compact = width <= 520;
      const fontSize = compact ? '16px' : '21px';

      this.panel.setSize(width, compact ? 82 : 74);
      this.livesText.setFontSize(fontSize).setPosition(margin, compact ? 8 : 12);
      this.partsText
        .setFontSize(fontSize)
        .setPosition(compact ? margin : margin + 160, compact ? 34 : 12);
      this.levelText
        .setFontSize(compact ? '15px' : '18px')
        .setPosition(width - margin, compact ? 8 : 14);
      this.superJumpText
        .setFontSize(compact ? '13px' : '14px')
        .setPosition(width - margin, compact ? 32 : 34);
      this.objectiveText
        .setFontSize(compact ? '12px' : '14px')
        .setPosition(width / 2, compact ? 56 : 50);
    };

    align();
    this.scale.on(Phaser.Scale.Events.RESIZE, align);

    this.refresh(getRunState());
    this.unsubscribeRunState = subscribeRunState((next) => this.refresh(next));
    this.objectiveHint = `${this.registry.get('hudObjective') ?? ''}`;
    this.refreshObjective();
    this.registry.events.on('changedata-hudObjective', this.onHudObjectiveChange, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, align);
      this.registry.events.off('changedata-hudObjective', this.onHudObjectiveChange, this);
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
    this.superJumpText.setText(runState.superJumpActive ? 'SJ ON' : '');
    this.refreshObjective();
  }

  private onHudObjectiveChange(
    _parent: Phaser.Data.DataManager,
    value: unknown,
  ): void {
    this.objectiveHint = typeof value === 'string' ? value : '';
    this.refreshObjective();
  }

  private refreshObjective(): void {
    this.objectiveText.setText(this.objectiveHint);
  }
}
