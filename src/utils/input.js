// Keyboard, pointer and on-screen touch input. Game code reads named actions, never raw keys.
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'action', Enter: 'confirm', NumpadEnter: 'confirm', Escape: 'back', KeyM: 'mute', Tab: 'tab',
};

const held = new Set();
const pressedSet = new Set();
const gestureHandlers = [];
const pointer = { x: -1, y: -1, down: false, clicked: false, moved: false };
let anyPressed = false;

function press(name) {
  if (!held.has(name)) pressedSet.add(name);
  held.add(name);
}

function release(name) {
  held.delete(name);
}

function fireGesture() {
  anyPressed = true;
  for (const fn of gestureHandlers) fn();
}

function buildTouchControls() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!coarse) return;
  const make = (side, buttons) => {
    const box = document.createElement('div');
    box.className = 'touch ' + side;
    for (const [label, name] of buttons) {
      const b = document.createElement('button');
      b.textContent = label;
      const on = (e) => { e.preventDefault(); fireGesture(); press(name); if (name === 'action') press('confirm'); };
      const off = (e) => { e.preventDefault(); release(name); if (name === 'action') release('confirm'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
      box.appendChild(b);
    }
    document.body.appendChild(box);
  };
  make('left', [['<', 'left'], ['>', 'right']]);
  make('right', [['v', 'down'], ['^', 'up'], ['A', 'action']]);
}

export const input = {
  pointer,
  down: (name) => held.has(name),
  pressed: (name) => pressedSet.has(name),
  axisX: () => (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
  axisY: () => (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0),
  anyPressed: () => anyPressed,
  // Called synchronously inside real user events (needed to unlock audio).
  onGesture: (fn) => gestureHandlers.push(fn),
  endFrame() {
    pressedSet.clear();
    anyPressed = false;
    pointer.clicked = false;
    pointer.moved = false;
  },
  attach(canvas, toGame) {
    window.addEventListener('keydown', (e) => {
      const name = KEYMAP[e.code];
      if (name) e.preventDefault();
      if (e.repeat) return;
      fireGesture();
      if (name) {
        press(name);
        if (name === 'action') press('confirm');
      }
    });
    window.addEventListener('keyup', (e) => {
      const name = KEYMAP[e.code];
      if (!name) return;
      release(name);
      if (name === 'action') release('confirm');
    });
    window.addEventListener('blur', () => held.clear());
    const setPos = (e) => {
      const p = toGame(e.clientX, e.clientY);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.moved = true;
    };
    canvas.addEventListener('pointerdown', (e) => {
      setPos(e);
      pointer.down = true;
      pointer.clicked = true;
      fireGesture();
    });
    canvas.addEventListener('pointermove', setPos);
    window.addEventListener('pointerup', () => { pointer.down = false; });
    buildTouchControls();
  },
};
