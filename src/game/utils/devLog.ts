import Phaser from 'phaser';

export const isDev = import.meta.env.DEV;

export function devLog(message: string, payload?: unknown): void {
  if (!isDev) {
    return;
  }

  if (payload === undefined) {
    console.log(`[DEV] ${message}`);
    return;
  }

  console.log(`[DEV] ${message}`, payload);
}

export function activeSceneKeys(scene: Phaser.Scene): string[] {
  const manager = (
    scene.scene as Phaser.Scenes.ScenePlugin & {
      manager: Phaser.Scenes.SceneManager;
    }
  ).manager;
  return manager.getScenes(true).map((s) => s.scene.key);
}

export function devSceneLifecycle(scene: Phaser.Scene, hook: string): void {
  if (!isDev) {
    return;
  }

  devLog(`${scene.scene.key}:${hook}`, {
    activeScenes: activeSceneKeys(scene),
  });
}
