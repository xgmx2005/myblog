export const PIXEL_BLAST_COLORS = {
  light: '#7183c8',
  dark: '#7b82d9'
} as const

export function getPixelBlastColor(isDark: boolean): string {
  return isDark ? PIXEL_BLAST_COLORS.dark : PIXEL_BLAST_COLORS.light
}

export function shouldAnimatePixelBlast(
  prefersReducedMotion: boolean,
  webglAvailable: boolean
): boolean {
  return !prefersReducedMotion && webglAvailable
}
