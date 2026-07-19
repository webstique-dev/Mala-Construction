/**
 * Single source of truth for responsive breakpoints, mirroring the CSS
 * variables in styles/tokens.css. Use these in JS (matchMedia, conditional
 * rendering); use the CSS variables directly inside .css files.
 */
export const BREAKPOINTS = {
  mobileMax: 480,
  tabletMin: 481,
  tabletMax: 1024,
  desktopMin: 1025,
};

export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobileMax}px)`,
  tablet: `(min-width: ${BREAKPOINTS.tabletMin}px) and (max-width: ${BREAKPOINTS.tabletMax}px)`,
  tabletDown: `(max-width: ${BREAKPOINTS.tabletMax}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktopMin}px)`,
};
