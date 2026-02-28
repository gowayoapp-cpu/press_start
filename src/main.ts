import Phaser from 'phaser';
import { gameConfig } from './game/config';

const mountId = 'game-root';

document.body.style.margin = '0';
document.body.style.backgroundColor = '#05070f';
document.body.style.overflow = 'hidden';

let mount = document.getElementById(mountId);
if (!mount) {
  mount = document.createElement('div');
  mount.id = mountId;
  document.body.appendChild(mount);
}

new Phaser.Game(gameConfig);
