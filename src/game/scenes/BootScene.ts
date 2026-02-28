import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super('BootScene');
  }

  public create(): void {
    this.createTextures();
    this.scene.start('MenuScene');
  }

  private createTextures(): void {
    if (!this.textures.exists('player')) {
      const g = this.add.graphics();
      g.fillStyle(0x6ce38f, 1);
      g.fillRoundedRect(0, 0, 32, 36, 10);
      g.fillStyle(0x0f3d26, 1);
      g.fillCircle(10, 14, 3);
      g.fillCircle(22, 14, 3);
      g.fillStyle(0xf4f9ff, 1);
      g.fillRect(10, 25, 12, 4);
      g.generateTexture('player', 32, 40);
      g.destroy();
    }

    if (!this.textures.exists('robot')) {
      const g = this.add.graphics();
      g.fillStyle(0xff6b6b, 1);
      g.fillRoundedRect(0, 4, 32, 22, 6);
      g.fillStyle(0x260808, 1);
      g.fillRect(5, 10, 8, 4);
      g.fillRect(19, 10, 8, 4);
      g.fillStyle(0x515151, 1);
      g.fillRect(3, 0, 26, 6);
      g.generateTexture('robot', 32, 28);
      g.destroy();
    }

    if (!this.textures.exists('part')) {
      const g = this.add.graphics();
      g.fillStyle(0xffce4f, 1);
      g.beginPath();
      g.moveTo(10, 0);
      g.lineTo(20, 10);
      g.lineTo(10, 20);
      g.lineTo(0, 10);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xfff6ad, 1);
      g.fillCircle(10, 10, 3);
      g.generateTexture('part', 20, 20);
      g.destroy();
    }

    if (!this.textures.exists('platform')) {
      const g = this.add.graphics();
      g.fillStyle(0x384056, 1);
      g.fillRect(0, 0, 64, 24);
      g.fillStyle(0x4f5b79, 1);
      g.fillRect(0, 0, 64, 5);
      g.generateTexture('platform', 64, 24);
      g.destroy();
    }

    if (!this.textures.exists('ice')) {
      const g = this.add.graphics();
      g.fillStyle(0x7fd1ff, 1);
      g.fillRect(0, 0, 64, 24);
      g.fillStyle(0xa7e5ff, 1);
      g.fillRect(0, 0, 64, 7);
      g.generateTexture('ice', 64, 24);
      g.destroy();
    }

    if (!this.textures.exists('gate_closed')) {
      const g = this.add.graphics();
      g.fillStyle(0x3f4a69, 1);
      g.fillRoundedRect(0, 0, 40, 74, 8);
      g.fillStyle(0x9aa9d1, 1);
      g.fillRect(17, 10, 6, 50);
      g.generateTexture('gate_closed', 40, 74);
      g.destroy();
    }

    if (!this.textures.exists('gate_open')) {
      const g = this.add.graphics();
      g.fillStyle(0x6dd3a6, 1);
      g.fillRoundedRect(0, 0, 40, 74, 8);
      g.fillStyle(0x093125, 1);
      g.fillRect(17, 10, 6, 50);
      g.generateTexture('gate_open', 40, 74);
      g.destroy();
    }

    if (!this.textures.exists('rocket_off')) {
      const g = this.add.graphics();
      g.fillStyle(0x5b6171, 1);
      g.fillRoundedRect(10, 0, 28, 74, 10);
      g.fillTriangle(10, 10, 24, -8, 38, 10);
      g.fillStyle(0x2a2f39, 1);
      g.fillCircle(24, 30, 7);
      g.generateTexture('rocket_off', 48, 76);
      g.destroy();
    }

    if (!this.textures.exists('rocket_on')) {
      const g = this.add.graphics();
      g.fillStyle(0xf97316, 1);
      g.fillTriangle(18, 74, 24, 95, 30, 74);
      g.fillStyle(0x8cf28e, 1);
      g.fillRoundedRect(10, 0, 28, 74, 10);
      g.fillTriangle(10, 10, 24, -8, 38, 10);
      g.fillStyle(0x1f5030, 1);
      g.fillCircle(24, 30, 7);
      g.generateTexture('rocket_on', 48, 98);
      g.destroy();
    }
  }
}
