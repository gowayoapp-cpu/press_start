import Phaser from 'phaser';

export interface ControlsState {
  horizontal: number;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
}

export interface Controls {
  getState: () => ControlsState;
  destroy: () => void;
}

type Action = 'left' | 'right' | 'jump';
type KeyboardMap = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  jump2: Phaser.Input.Keyboard.Key;
};

interface TouchButton {
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
}

export function createControls(scene: Phaser.Scene): Controls {
  const cursors = scene.input.keyboard?.createCursorKeys();
  const keys = scene.input.keyboard?.addKeys({
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D,
    jump: Phaser.Input.Keyboard.KeyCodes.W,
    jump2: Phaser.Input.Keyboard.KeyCodes.SPACE,
  }) as KeyboardMap | undefined;

  const pressedPointers: Record<Action, Set<number>> = {
    left: new Set<number>(),
    right: new Set<number>(),
    jump: new Set<number>(),
  };
  const pointerToAction = new Map<number, Action>();

  const layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(2000);
  const fillColors = {
    left: 0x3a8ef6,
    right: 0x3a8ef6,
    jump: 0xf59e0b,
  };

  const createButton = (
    x: number,
    y: number,
    textLabel: string,
    action: Action,
    radius = 48,
  ): TouchButton => {
    const circle = scene.add
      .circle(x, y, radius, fillColors[action], 0.24)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setScrollFactor(0);
    const label = scene.add
      .text(x, y, textLabel, {
        fontFamily: 'Verdana',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const zone = scene.add
      .zone(x, y, radius * 2.2, radius * 2.2)
      .setScrollFactor(0)
      .setInteractive();

    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pressedPointers[action].add(pointer.id);
      pointerToAction.set(pointer.id, action);
      circle.setFillStyle(fillColors[action], 0.54);
    });

    layer.add([circle, label, zone]);
    return { circle, label, zone };
  };

  const leftButton = createButton(92, scene.scale.height - 74, '<', 'left');
  const rightButton = createButton(212, scene.scale.height - 74, '>', 'right');
  const jumpButton = createButton(
    scene.scale.width - 94,
    scene.scale.height - 74,
    '^',
    'jump',
  );

  const alignButtons = (): void => {
    const width = scene.scale.width;
    const height = scene.scale.height;

    leftButton.circle.setPosition(92, height - 74);
    leftButton.zone.setPosition(92, height - 74);
    leftButton.label.setPosition(92, height - 74);

    rightButton.circle.setPosition(212, height - 74);
    rightButton.zone.setPosition(212, height - 74);
    rightButton.label.setPosition(212, height - 74);

    jumpButton.circle.setPosition(width - 94, height - 74);
    jumpButton.zone.setPosition(width - 94, height - 74);
    jumpButton.label.setPosition(width - 94, height - 74);
  };

  const refreshButtons = (): void => {
    leftButton.circle.setFillStyle(
      fillColors.left,
      pressedPointers.left.size > 0 ? 0.54 : 0.24,
    );
    rightButton.circle.setFillStyle(
      fillColors.right,
      pressedPointers.right.size > 0 ? 0.54 : 0.24,
    );
    jumpButton.circle.setFillStyle(
      fillColors.jump,
      pressedPointers.jump.size > 0 ? 0.6 : 0.24,
    );
  };

  const releasePointer = (pointer: Phaser.Input.Pointer): void => {
    const action = pointerToAction.get(pointer.id);
    if (!action) {
      return;
    }
    pointerToAction.delete(pointer.id);
    pressedPointers[action].delete(pointer.id);
    refreshButtons();
  };

  const clearTouchState = (): void => {
    pressedPointers.left.clear();
    pressedPointers.right.clear();
    pressedPointers.jump.clear();
    pointerToAction.clear();
    refreshButtons();
  };

  alignButtons();
  scene.input.on('pointerup', releasePointer);
  scene.input.on('pointerupoutside', releasePointer);
  scene.input.on('gameout', clearTouchState);
  scene.scale.on(Phaser.Scale.Events.RESIZE, alignButtons);

  let jumpWasDown = false;

  const getState = (): ControlsState => {
    const leftPressed =
      (cursors?.left.isDown ?? false) ||
      (keys?.left.isDown ?? false) ||
      pressedPointers.left.size > 0;
    const rightPressed =
      (cursors?.right.isDown ?? false) ||
      (keys?.right.isDown ?? false) ||
      pressedPointers.right.size > 0;

    const jumpDown =
      (cursors?.up.isDown ?? false) ||
      (cursors?.space.isDown ?? false) ||
      (keys?.jump.isDown ?? false) ||
      (keys?.jump2.isDown ?? false) ||
      pressedPointers.jump.size > 0;

    const horizontal = (leftPressed ? -1 : 0) + (rightPressed ? 1 : 0);
    const jumpJustPressed = jumpDown && !jumpWasDown;
    jumpWasDown = jumpDown;

    return {
      horizontal,
      jumpHeld: jumpDown,
      jumpJustPressed,
    };
  };

  const destroy = (): void => {
    scene.input.off('pointerup', releasePointer);
    scene.input.off('pointerupoutside', releasePointer);
    scene.input.off('gameout', clearTouchState);
    scene.scale.off(Phaser.Scale.Events.RESIZE, alignButtons);
    layer.destroy(true);
  };

  return {
    getState,
    destroy,
  };
}
