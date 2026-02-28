import Phaser from 'phaser';
import { INITIAL_LIVES, TOTAL_PARTS_REQUIRED } from '../constants';

export interface RunState {
  lives: number;
  partsCollected: number;
  currentLevel: 1 | 2;
}

const events = new Phaser.Events.EventEmitter();

let state: RunState = {
  lives: INITIAL_LIVES,
  partsCollected: 0,
  currentLevel: 1,
};

export function getRunState(): RunState {
  return { ...state };
}

export function subscribeRunState(listener: (next: RunState) => void): () => void {
  events.on('changed', listener);
  return () => {
    events.off('changed', listener);
  };
}

function emitStateChange(): void {
  events.emit('changed', getRunState());
}

export function resetRunState(): RunState {
  state = {
    lives: INITIAL_LIVES,
    partsCollected: 0,
    currentLevel: 1,
  };
  emitStateChange();
  return getRunState();
}

export function loseLife(): number {
  state = {
    ...state,
    lives: Math.max(0, state.lives - 1),
  };
  emitStateChange();
  return state.lives;
}

export function addPart(amount = 1): number {
  state = {
    ...state,
    partsCollected: Math.min(TOTAL_PARTS_REQUIRED, state.partsCollected + amount),
  };
  emitStateChange();
  return state.partsCollected;
}

export function setLevel(level: 1 | 2): void {
  if (state.currentLevel === level) {
    return;
  }

  state = {
    ...state,
    currentLevel: level,
  };
  emitStateChange();
}
