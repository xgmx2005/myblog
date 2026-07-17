export const DOT_GRID_COLORS = {
  light: {
    base: '#4f9db1',
    active: '#16b8c4'
  },
  dark: {
    base: '#30283f',
    active: '#6947ff'
  }
} as const

export function getDotGridColors(isDark: boolean) {
  return isDark ? DOT_GRID_COLORS.dark : DOT_GRID_COLORS.light
}

export function shouldAnimateDotGrid(reducedMotion: boolean, hasCanvas2D: boolean) {
  return !reducedMotion && hasCanvas2D
}
