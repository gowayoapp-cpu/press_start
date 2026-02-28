import Phaser from 'phaser';
import { devLog } from '../utils/devLog';
import { resetRunState } from '../utils/runState';

export class MenuScene extends Phaser.Scene {
  private started = false;

  public constructor() {
    super('MenuScene');
  }

  public create(): void {
    this.started = false;
    this.registry.set('hudObjective', '');
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }

    this.cameras.main.setBackgroundColor('#071220');
    this.addBackgroundStars();

    this.add
      .text(this.scale.width / 2, 110, 'Rabbit Boy Space Run', {
        fontFamily: 'Verdana',
        fontSize: '52px',
        color: '#f7ffe4',
        stroke: '#132436',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.scale.width / 2,
        250,
        'Collect all 10 cosmic parts.\nAvoid patrol robots.\nReach the rocket to escape.',
        {
          fontFamily: 'Verdana',
          fontSize: '24px',
          color: '#c7d7ff',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

    const button = this.add
      .rectangle(this.scale.width / 2, 385, 320, 86, 0x31a163, 0.95)
      .setStrokeStyle(3, 0xeaffd0)
      .setInteractive({ useHandCursor: true });
    const buttonText = this.add
      .text(this.scale.width / 2, 385, 'START MISSION', {
        fontFamily: 'Verdana',
        fontSize: '30px',
        color: '#0b2f1a',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => {
      button.setFillStyle(0x4ec67f, 1);
      buttonText.setColor('#092412');
    });
    button.on('pointerout', () => {
      button.setFillStyle(0x31a163, 0.95);
      buttonText.setColor('#0b2f1a');
    });
    button.on('pointerup', () => this.startMission());

    this.input.keyboard?.once('keydown-ENTER', () => this.startMission());
    this.input.keyboard?.once('keydown-SPACE', () => this.startMission());
  }

  private startMission(): void {
    if (this.started) {
      devLog('MenuScene:startMission blocked by started=true');
      return;
    }
    this.started = true;
    devLog('MenuScene:startMission transition to Level1Scene');
    resetRunState();
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
    this.scene.start('Level1Scene', { resetProgress: true });
  }

  private addBackgroundStars(): void {
    const stars = this.add.graphics();
    stars.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 120; i += 1) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const radius = Phaser.Math.FloatBetween(0.6, 1.8);
      stars.fillCircle(x, y, radius);
    }

    this.tweens.add({
      targets: stars,
      alpha: 0.5,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
