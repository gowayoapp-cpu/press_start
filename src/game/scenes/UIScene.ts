import Phaser from 'phaser';
import { INITIAL_LIVES, TOTAL_PARTS_REQUIRED } from '../config';

export class UIScene extends Phaser.Scene {
  private livesText!: Phaser.GameObjects.Text;
  private partsText!: Phaser.GameObjects.Text;

  public constructor() {
    super('UIScene');
  }

  public create(): void {
    this.add
      .rectangle(0, 0, this.scale.width, 52, 0x000000, 0.38)
      .setOrigin(0)
      .setScrollFactor(0);

    this.livesText = this.add
      .text(18, 14, '', {
        fontFamily: 'Verdana',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setScrollFactor(0);
    this.partsText = this.add
      .text(250, 14, '', {
        fontFamily: 'Verdana',
        fontSize: '22px',
        color: '#ffe18f',
      })
      .setScrollFactor(0);

    this.refresh();

    this.registry.events.on('changedata-lives', this.refresh, this);
    this.registry.events.on('changedata-parts', this.refresh, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata-lives', this.refresh, this);
      this.registry.events.off('changedata-parts', this.refresh, this);
    });
  }

  private refresh(): void {
    const lives = (this.registry.get('lives') as number | undefined) ?? INITIAL_LIVES;
    const parts = (this.registry.get('parts') as number | undefined) ?? 0;
    this.livesText.setText(`Lives: ${Math.max(lives, 0)}`);
    this.partsText.setText(`Cosmic Parts: ${parts}/${TOTAL_PARTS_REQUIRED}`);
  }
}
