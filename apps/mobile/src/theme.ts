/** UI design tokens for the mobile shell (the story cards use core themes). */
export const ui = {
  bg: '#0b1f1c',
  bgElev: '#12302b',
  bgElev2: '#183a34',
  /** Decorative dividers only. */
  line: 'rgba(255,255,255,0.10)',
  /**
   * Outlines of things you interact with (inputs, chips): 3:1 against the
   * backgrounds, as WCAG 1.4.11 asks of a control's boundary.
   */
  lineStrong: 'rgba(255,255,255,0.36)',
  text: '#f3efe4',
  textMuted: '#a9b8b1',
  accent: '#d9b65c',
  accentInk: '#1b1400',
  /** 4.5:1 or better on bg, bgElev and bgElev2. */
  danger: '#ea8080',
  success: '#1f5a44',
  radius: 14,
} as const;

export const space = (n: number) => n * 4;
