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

/* svg free of use from https://uxwing.com/formula-fx-icon/ */
export const FX_SVG = /*xml*/ `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 121.8 122.9' width='16' height='16' focusable='false'>
  <path d='m28 34-4 5v2h10l-6 40c-4 22-6 28-7 30-2 2-3 3-5 3-3 0-7-2-9-4H4c-2 2-4 4-4 7s4 6 8 6 9-2 15-8c8-7 13-17 18-39l7-35 13-1 3-6H49c4-23 7-27 11-27 2 0 5 2 8 6h4c1-1 4-4 4-7 0-2-3-6-9-6-5 0-13 4-20 10-6 7-9 14-11 24h-8zm41 16c4-5 7-7 8-7s2 1 5 9l3 12c-7 11-12 17-16 17l-3-1-2-1c-3 0-6 3-6 7s3 7 7 7c6 0 12-6 22-23l3 10c3 9 6 13 10 13 5 0 11-4 18-15l-3-4c-4 6-7 8-8 8-2 0-4-3-6-10l-5-15 8-10 6-4 3 1 3 2c2 0 6-3 6-7s-2-7-6-7c-6 0-11 5-21 20l-2-6c-3-9-5-14-9-14-5 0-12 6-18 15l3 3z' fill='#BDBDBD'/>
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
