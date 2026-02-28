import Phaser from 'phaser';
import {
  BASE_JUMP_MULTIPLIER,
  INITIAL_LIVES,
  LEVEL1_PARTS_REQUIRED,
  MAX_LIVES,
  SUPER_JUMP_MULTIPLIER,
  TOTAL_PARTS_REQUIRED,
} from './constants';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { Level1Scene } from './scenes/Level1Scene';
import { Level2Scene } from './scenes/Level2Scene';
import { Level3Scene } from './scenes/Level3Scene';
import { MenuScene } from './scenes/MenuScene';
import { UIScene } from './scenes/UIScene';
import { WinScene } from './scenes/WinScene';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export {
  BASE_JUMP_MULTIPLIER,
  INITIAL_LIVES,
  LEVEL1_PARTS_REQUIRED,
  MAX_LIVES,
  SUPER_JUMP_MULTIPLIER,
  TOTAL_PARTS_REQUIRED,
};

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
    Level3Scene,
    UIScene,
    GameOverScene,
    WinScene,
  ],
};
