export const BALL_ASSETS: Record<number, string> = {
  0: 'https://tgdream.pro/assets/png/ball_0-Ca74Ns3T.png',
  1: 'https://tgdream.pro/assets/png/ball_1-DFUEzKvm.png',
  2: 'https://tgdream.pro/assets/png/ball_2-BA1HkQbr.png',
  3: 'https://tgdream.pro/assets/png/ball_3-CSGWgLyY.png',
  4: 'https://tgdream.pro/assets/png/ball_4-CU90k0Z5.png',
  5: 'https://tgdream.pro/assets/png/ball_5-DD5VBkEF.png',
  6: 'https://tgdream.pro/assets/png/ball_6-CRRe003w.png',
  7: 'https://tgdream.pro/assets/png/ball_7-Cf2z_aqK.png',
  8: 'https://tgdream.pro/assets/png/ball_8-BWd7rcUJ.png',
  9: 'https://tgdream.pro/assets/png/ball_9-DDw5YEZU.png',
};

export const TIMER_ASSETS = {
  inactive: '/assets/watch_inactive.svg',
  active: '/assets/watch_active.svg',
};

export const GAME_TYPE_LABELS: Record<string, string> = {
  wingo_30s: 'Win Go 30s',
  wingo_1m: 'Win Go 1Min',
  wingo_3m: 'Win Go 3Min',
  wingo_5m: 'Win Go 5Min',
};

export const GAME_TYPE_DURATIONS: Record<string, number> = {
  wingo_30s: 30,
  wingo_1m: 60,
  wingo_3m: 180,
  wingo_5m: 300,
};

export function getNumberColor(num: number): 'green' | 'red' | 'violet' | 'red_violet' | 'green_violet' {
  if (num === 0) return 'red_violet';
  if (num === 5) return 'green_violet';
  if ([1, 3, 7, 9].includes(num)) return 'green';
  return 'red';
}

export function getNumberBigSmall(num: number): 'big' | 'small' {
  return num >= 5 ? 'big' : 'small';
}
