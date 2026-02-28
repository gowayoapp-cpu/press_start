import Phaser from 'phaser';

export interface ControlsState {
  horizontal: number;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  pauseJustPressed: boolean;
}

export interface Controls {
  getState: () => ControlsState;
  destroy: () => void;
}

type Action = 'left' | 'right' | 'jump' | 'pause';
type KeyboardMap = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  jump2: Phaser.Input.Keyboard.Key;
  pause: Phaser.Input.Keyboard.Key;
  pause2: Phaser.Input.Keyboard.Key;
};

interface TouchButton {
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  action: Action;
  radius: number;
}

export function createControls(scene: Phaser.Scene): Controls {
  const cursors = scene.input.keyboard?.createCursorKeys();
  const keys = scene.input.keyboard?.addKeys({
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D,
    jump: Phaser.Input.Keyboard.KeyCodes.W,
    jump2: Phaser.Input.Keyboard.KeyCodes.SPACE,
    pause: Phaser.Input.Keyboard.KeyCodes.ESC,
    pause2: Phaser.Input.Keyboard.KeyCodes.P,
  }) as KeyboardMap | undefined;

  const pressedPointers: Record<Action, Set<number>> = {
    left: new Set<number>(),
    right: new Set<number>(),
    jump: new Set<number>(),
    pause: new Set<number>(),
  };
  const pointerToAction = new Map<number, Action>();

  const layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(2000);
  const fillColors: Record<Action, number> = {
    left: 0x3a8ef6,
    right: 0x3a8ef6,
    jump: 0xf59e0b,
    pause: 0xc084fc,
  };

  const createButton = (
    x: number,
    y: number,
    labelText: string,
    action: Action,
    radius: number,
  ): TouchButton => {
    const circle = scene.add
      .circle(x, y, radius, fillColors[action], action === 'pause' ? 0.28 : 0.24)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setScrollFactor(0);
    const label = scene.add
      .text(x, y, labelText, {
        fontFamily: 'Verdana',
        fontSize: `${Math.round(radius * 0.95)}px`,
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
      circle.setFillStyle(fillColors[action], 0.58);
    });

    layer.add([circle, label, zone]);
    return {
      circle,
      label,
      zone,
      action,
      radius,
    };
  };

  const controlRadius = Phaser.Math.Clamp(
    Math.round(Math.min(scene.scale.width, scene.scale.height) * 0.072),
    32,
    50,
  );
  const pauseRadius = Math.max(24, Math.round(controlRadius * 0.58));

  const leftButton = createButton(0, 0, '<', 'left', controlRadius);
  const rightButton = createButton(0, 0, '>', 'right', controlRadius);
  const jumpButton = createButton(0, 0, '^', 'jump', controlRadius);
  const pauseButton = createButton(0, 0, '||', 'pause', pauseRadius);

  const allButtons = [leftButton, rightButton, jumpButton, pauseButton];

  const alignButtons = (): void => {
    const width = scene.scale.width;
    const height = scene.scale.height;
    const baseMargin = Math.max(14, Math.round(Math.min(width, height) * 0.03));
    const bottom = height - (controlRadius + baseMargin);
    const horizontalGap = Math.round(controlRadius * 0.72);

    const leftX = controlRadius + baseMargin;
    const rightX = leftX + controlRadius * 2 + horizontalGap;
    const jumpX = width - (controlRadius + baseMargin);
    const pauseX = width - (pauseRadius + baseMargin);
    const pauseY = pauseRadius + baseMargin + 2;

    leftButton.circle.setPosition(leftX, bottom);
    leftButton.zone.setPosition(leftX, bottom);
    leftButton.label.setPosition(leftX, bottom);

    rightButton.circle.setPosition(rightX, bottom);
    rightButton.zone.setPosition(rightX, bottom);
    rightButton.label.setPosition(rightX, bottom);

    jumpButton.circle.setPosition(jumpX, bottom);
    jumpButton.zone.setPosition(jumpX, bottom);
    jumpButton.label.setPosition(jumpX, bottom);

    pauseButton.circle.setPosition(pauseX, pauseY);
    pauseButton.zone.setPosition(pauseX, pauseY);
    pauseButton.label.setPosition(pauseX, pauseY - 1);
  };

  const refreshButtons = (): void => {
    allButtons.forEach((button) => {
      const pressed = pressedPointers[button.action].size > 0;
      const baseAlpha = button.action === 'pause' ? 0.28 : 0.24;
      button.circle.setFillStyle(fillColors[button.action], pressed ? 0.58 : baseAlpha);
    });
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
    pressedPointers.pause.clear();
    pointerToAction.clear();
    refreshButtons();
  };

  alignButtons();
  scene.input.on('pointerup', releasePointer);
  scene.input.on('pointerupoutside', releasePointer);
  scene.input.on('gameout', clearTouchState);
  scene.scale.on(Phaser.Scale.Events.RESIZE, alignButtons);

  let jumpWasDown = false;
  let pauseWasDown = false;

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
    const pauseDown =
      (keys?.pause.isDown ?? false) ||
      (keys?.pause2.isDown ?? false) ||
      pressedPointers.pause.size > 0;

    const horizontal = (leftPressed ? -1 : 0) + (rightPressed ? 1 : 0);
    const jumpJustPressed = jumpDown && !jumpWasDown;
    const pauseJustPressed = pauseDown && !pauseWasDown;
    jumpWasDown = jumpDown;
    pauseWasDown = pauseDown;

    return {
      horizontal,
      jumpHeld: jumpDown,
      jumpJustPressed,
      pauseJustPressed,
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
