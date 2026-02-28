import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { Level1Scene } from './scenes/Level1Scene';
import { Level2Scene } from './scenes/Level2Scene';
import { MenuScene } from './scenes/MenuScene';
import { UIScene } from './scenes/UIScene';
import { WinScene } from './scenes/WinScene';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const INITIAL_LIVES = 3;
export const TOTAL_PARTS_REQUIRED = 10;
export const LEVEL1_PARTS_REQUIRED = 5;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#05070f',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 900 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  scene: [
    BootScene,
    MenuScene,
    Level1Scene,
    Level2Scene,
    UIScene,
    GameOverScene,
    WinScene,
  ],
};
