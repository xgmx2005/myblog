export const DOT_GRID_COLORS = {
  light: {
    base: '#6aa6b5',
    active: '#00b8d4',
    glow: '#70e2e8',
    glowOpacity: 0.18
  },
  dark: {
    base: '#2f293a',
    active: '#5227ff',
    glow: '#5227ff',
    glowOpacity: 0.1
  }
} as const

export function getDotGridColors(isDark: boolean) {
  return isDark ? DOT_GRID_COLORS.dark : DOT_GRID_COLORS.light
}

export function shouldAnimateDotGrid(reducedMotion: boolean, hasCanvas2D: boolean) {
  return !reducedMotion && hasCanvas2D
}
