// All tunables live here. Units are pixels and seconds unless noted.
export const VIEW = { width: 320, height: 180 };
export const DT_MAX = 1 / 20; // clamp so a lag spike cannot break physics

export const FONT_FAMILY = "'Press Start 2P', monospace";
export const font = (px = 8) => `${px}px ${FONT_FAMILY}`;

// Bright console-style palette. The shader mutes it at low integrity and heals it to full colour.
export const COLORS = {
  ink: '#101030', night: '#26266a', purple: '#9a58e8', red: '#e8383c',
  blue: '#3c78f8', teal: '#18c8b0', orange: '#f88800', yellow: '#fcd800',
  white: '#fcfcfc', grey: '#b8b8d0', pale: '#e4e4f4', slate: '#6c6c90',
  sky: '#5c94fc', skyLight: '#a4d0fc', green: '#00a800', lime: '#a8e830', pink: '#f878c8',
  grassLight: '#38c838', grassDark: '#20a020', brick: '#c84c0c', brickDark: '#7c2c08',
  dirt: '#a85820', gold: '#fcb830', desk: '#2f5fd0', deskLine: '#4a7af0',
};

export const INTEGRITY_PER_SECTOR = 0.25;
export const INTEGRITY_HEAL_RATE = 0.6; // displayed integrity catches up at this speed per second

// Window chrome and the content rectangle sectors draw into.
export const WINDOW = { x: 6, y: 4, w: 308, h: 158, titleH: 12, border: 2, openTime: 0.22 };
export const AREA = { x: 8, y: 18, w: 304, h: 142 };
export const TASKBAR = { y: 164, h: 16 };

export const FLOW = {
  repairTime: 1.6, collapseTime: 2.6, hintTime: 4.5, introTime: 2.6,
  bounceBannerTime: 1.1, maxTwist: 3, shakeDecay: 24, glitchDecay: 2.2,
};

export const STORY = { panelTime: 2.6, typeSpeed: 28 };

export const HUB = {
  cellW: 144, cellH: 44, gapX: 16, startX: 8, rowY: [36, 88], bossY: 138,
  iconW: 36, iconH: 28,
};

export const PLATFORMER = {
  tile: 16, groundRow: 7, gravity: 800, jumpVel: 300, bounceVel: 440, runSpeed: 90,
  accel: 900, coyote: 0.09, jumpBuffer: 0.12, maxFall: 480, playerW: 10, playerH: 14,
  cameraLead: 0.35, wallHeight: 4, hp: 3, invuln: 1.2, pitBounce: 330,
};

export const SHOOTER = {
  playerSpeed: 110, fireSlow: 0.3, fireFast: 0.15, bulletVx: 50, bulletVy: 210, maxBounces: 4, upgradeEvery: 10, maxLevel: 3, upgradeFlash: 1.2, topLevelFireScale: 0.8,
  bulletLife: 2.6, enemyBulletSpeed: 60,
  duration: 26, hp: 4, invuln: 1.0, spawnStart: 1.0, spawnEnd: 0.55, bugSpeed: 30,
  gunnerChance: 0.25, gunnerFire: 1.5,
};

export const RACER = {
  horizon: 44, k: 300, roadHalf: 132, curveK: 0.0018, stripe: 7, maxSpeed: 70, accel: 38,
  offroadCap: 0.4, hitSlow: 0.4, trackLength: 1000, timeLimit: 28, steer: 1.9,
  pushOut: 0.55, obstacleCount: 26, visible: 150,
};

export const PUZZLE = { cell: 36, timeLimit: 60, wrongTiles: 6, wrongStep: 1 };

export const BOSS = {
  phaseTime: 9, banner: 0.9, hp: 3, invuln: 1.0,
  gravity: 800, jump: 300, obstacleSpeed: 120, laneTime: 0.1, qteWindow: 1.5,
};

export const AUDIO = { master: 0.22, fadeIn: 1.2, bpm: 112, lookahead: 0.14 };

// Chapters: chapter 2 unlocks after the chapter 1 boss and brings the integrity back to 0.
export const CHAPTERS = [
  { ids: ['platformer', 'shooter', 'racer', 'puzzle'], boss: 'boss' },
  { ids: ['breakout', 'snake', 'whack', 'flappy'], boss: 'boss2' },
];

export const SECTOR_LABELS = {
  platformer: 'memory', shooter: 'firewall', racer: 'databus', puzzle: 'photos', boss: 'kernel',
  breakout: 'cache', snake: 'network', whack: 'bugfix', flappy: 'wifi', boss2: 'cloud',
};

// Difficulty. hearts: extra (or fewer) lives. speed: enemy/obstacle speed. time: time limits. extra: amount of stuff.
export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard'];
export const DIFFICULTY = {
  easy: { label: 'EASY', tag: 'KIDS', hearts: 2, speed: 0.75, time: 1.5, extra: -2, bars: 1 },
  normal: { label: 'NORMAL', tag: 'EVERYONE', hearts: 0, speed: 1, time: 1, extra: 0, bars: 2 },
  hard: { label: 'HARD', tag: 'PROS', hearts: -1, speed: 1.3, time: 0.8, extra: 2, bars: 3 },
};

export const KO = { inputDelay: 0.6 };

export const BREAKOUT = {
  paddleW: 40, paddleH: 5, paddleSpeed: 220, ballSpeed: 150, ballMax: 240, speedPerBrick: 3,
  cols: 8, rows: 3, brickW: 34, brickH: 10, gap: 2, top: 36, hp: 3, autoLaunch: 1.1,
};

export const SNAKE = {
  cell: 8, cols: 36, rows: 15, step: 0.12, goal: 10, viruses: 3, hp: 3, invuln: 1.0, startLen: 4, maxLen: 70,
};

export const WHACK = {
  goal: 14, timeLimit: 36, upTime: 1.1, spawnEvery: 0.6, fileChance: 0.2, hp: 3,
};

export const FLAPPY = {
  gravity: 620, flap: 190, scroll: 70, gap: 54, spacing: 118, goal: 10, hp: 3, invuln: 1.2, playerX: 72,
};

// Maze-chase boss fights (kernel and cloud). Distances are in tiles, speeds in tiles per second.
export const PACMAN = {
  tile: 12, cols: 23, rows: 9, originX: 14, originY: 28, playerSpeed: 6, ghostSpeed: 4.8, frightSpeed: 3,
  frightTime: 6, hp: 3, invuln: 1.6, startDelay: 1.0, respawnTime: 3, hitRange: 0.7,
};
