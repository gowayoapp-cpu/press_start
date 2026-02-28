import Phaser from 'phaser';
import {
  BASE_JUMP_MULTIPLIER,
  INITIAL_LIVES,
  LEVEL1_PARTS_REQUIRED,
  MAX_LIVES,
  TOTAL_PARTS_REQUIRED,
} from '../constants';

export interface RunState {
  lives: number;
  maxLives: number;
  partsCollected: number;
  currentLevel: 1 | 2 | 3 | 4;
  jumpMultiplier: number;
  superJumpActive: boolean;
}

const events = new Phaser.Events.EventEmitter();

let state: RunState = {
  lives: INITIAL_LIVES,
  maxLives: MAX_LIVES,
  partsCollected: 0,
  currentLevel: 1,
  jumpMultiplier: BASE_JUMP_MULTIPLIER,
  superJumpActive: false,
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
    maxLives: MAX_LIVES,
    partsCollected: 0,
    currentLevel: 1,
    jumpMultiplier: BASE_JUMP_MULTIPLIER,
    superJumpActive: false,
  };
  emitStateChange();
  return getRunState();
}

export function loseLife(): number {
  return loseLives(1);
}

export function loseLives(amount = 1): number {
  const safeAmount = Math.max(1, Math.floor(amount));
  state = {
    ...state,
    lives: Math.max(0, state.lives - safeAmount),
  };
  emitStateChange();
  return state.lives;
}

export function addLife(amount = 1): number {
  state = {
    ...state,
    lives: Phaser.Math.Clamp(state.lives + amount, 0, state.maxLives),
  };
  emitStateChange();
  return state.lives;
}

export function resetLivesToMax(): number {
  state = {
    ...state,
    lives: state.maxLives,
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

export function setLevel(level: 1 | 2 | 3 | 4): void {
  if (state.currentLevel === level) {
    return;
  }

  state = {
    ...state,
    currentLevel: level,
  };
  emitStateChange();
}

export function restartLevelFromBeginning(level: 1 | 2 | 3 | 4): RunState {
  const basePartsForLevel =
    level === 1 ? 0 : level === 2 ? LEVEL1_PARTS_REQUIRED : TOTAL_PARTS_REQUIRED;

  state = {
    ...state,
    lives: state.maxLives,
    currentLevel: level,
    partsCollected: basePartsForLevel,
    jumpMultiplier: BASE_JUMP_MULTIPLIER,
    superJumpActive: false,
  };
  emitStateChange();
  return getRunState();
}

export function enableSuperJump(multiplier: number): void {
  state = {
    ...state,
    jumpMultiplier: Math.max(BASE_JUMP_MULTIPLIER, multiplier),
    superJumpActive: true,
  };
  emitStateChange();
}

export function resetPowerupsForLevel(): void {
  if (state.jumpMultiplier === BASE_JUMP_MULTIPLIER && !state.superJumpActive) {
    return;
  }

  state = {
    ...state,
    jumpMultiplier: BASE_JUMP_MULTIPLIER,
    superJumpActive: false,
  };
  emitStateChange();
}
