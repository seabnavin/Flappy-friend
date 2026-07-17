// ============================================================
// config.js — constants & theme definitions
// ============================================================

export const GRAVITY   = 0.45;
export const FLAP      = -8;
export const PIPE_GAP  = 160;
export const WIN_SCORE = 30;
export const CUBE_SIZE = 36;

export const CANVAS_W = 720;
export const CANVAS_H = 640;

export const themes = {
  nature:   { bg: ['#70c5ce', '#70c5ce'], ground: '#ded895', name: 'OG',      pillarType: 'normal'  },
  desert:   { bg: ['#f4a460', '#c2956c'], ground: '#c2956c', name: 'Desert',   pillarType: 'cactus'  },
  mountain: { bg: ['#aad4f5', '#d0eaff'], ground: '#e8e8e8', name: 'Mountain', pillarType: 'icicle'  },
};
