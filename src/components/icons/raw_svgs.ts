/**
 * SVG markup used in `css` tagged templates as `data:image/svg+xml` URIs.
 *
 * Keep these values in a separate module so Rolldown references them instead
 * of inlining them into template literals. Inlining produces nested template
 * literals, which the downstream `rjsmin` minifier cannot parse correctly
 * because it relies on regular expressions.
 *
 * Do not inline these constants.
 */

export const CHECK_SVG = /*xml*/ `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'>
  <path fill='none' stroke='#FFF' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='m6 10 3 3 6-6'/>
</svg>
`;

export const CIRCLE_SVG = /*xml*/ `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'>
  <circle r="2" fill="#FFF"/>
</svg>
`;

export const TRANSPARENT_BACKGROUND_SVG = /*xml*/ `
<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
  <path fill="#d9d9d9" d="M5 5h5v5H5zH0V0h5"/>
</svg>
`;

export const CURSOR_SVG = /*xml*/ `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="14" height="16"><path d="M6.5.4c1.3-.8 2.9-.1 3.8 1.4l2.9 5.1c.2.4.9 1.6-.4 2.3l-1.6.9 1.8 3.1c.2.4.1 1-.2 1.2l-1.6 1c-.3.1-.9 0-1.1-.4l-1.8-3.1-1.6 1c-.6.4-1.7 0-2.2-.8L0 4.3"/><path fill="#fff" d="M9.1 2a1.4 1.1 60 0 0-1.7-.6L5.5 2.5l.9 1.6-1 .6-.9-1.6-.6.4 1.8 3.1-1.3.7-1.8-3.1-1 .6 3.8 6.6 6.8-3.98M3.9 8.8 10.82 5l.795 1.4-6.81 3.96"/></svg>
`;

export const CARET_DOWN_SVG = /*xml*/ `
<svg xmlns='http://www.w3.org/2000/svg' width='7' height='4' viewBox='0 0 7 4'>
  <polygon fill='%23374151' points='3.5 4 7 0 0 0'/>
</svg>
`;
