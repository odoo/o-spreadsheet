import { css } from "../helpers";

css/* scss */ `
  .o-spreadsheet {
    .o-icon {
      .small-text {
        font: bold 9px sans-serif;
      }
      .heavy-text {
        font: bold 16px sans-serif;
      }
    }
  }
`;

export type IconSetType = keyof typeof ICON_SETS;

// -----------------------------------------------------------------------------
// We need here the svg of the icons that we need to convert to images for the renderer
// -----------------------------------------------------------------------------
const ARROW_DOWN =
  '<svg class="o-cf-icon arrow-down" width="10" height="10" focusable="false" viewBox="0 0 448 512"><path fill="#E06666" d="M413.1 222.5l22.2 22.2c9.4 9.4 9.4 24.6 0 33.9L241 473c-9.4 9.4-24.6 9.4-33.9 0L12.7 278.6c-9.4-9.4-9.4-24.6 0-33.9l22.2-22.2c9.5-9.5 25-9.3 34.3.4L184 343.4V56c0-13.3 10.7-24 24-24h32c13.3 0 24 10.7 24 24v287.4l114.8-120.5c9.3-9.8 24.8-10 34.3-.4z"></path></svg>';
const ARROW_UP =
  '<svg class="o-cf-icon arrow-up" width="10" height="10" focusable="false" viewBox="0 0 448 512"><path fill="#6AA84F" d="M34.9 289.5l-22.2-22.2c-9.4-9.4-9.4-24.6 0-33.9L207 39c9.4-9.4 24.6-9.4 33.9 0l194.3 194.3c9.4 9.4 9.4 24.6 0 33.9L413 289.4c-9.5 9.5-25 9.3-34.3-.4L264 168.6V456c0 13.3-10.7 24-24 24h-32c-13.3 0-24-10.7-24-24V168.6L69.2 289.1c-9.3 9.8-24.8 10-34.3.4z"></path></svg>';
const ARROW_RIGHT =
  '<svg class="o-cf-icon arrow-right" width="10" height="10" focusable="false" viewBox="0 0 448 512"><path fill="#F0AD4E" d="M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L441 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4 9.4-24.6 9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z"></path></svg>';

const SMILE =
  '<svg class="o-cf-icon smile" width="10" height="10" focusable="false" viewBox="0 0 496 512"><path fill="#6AA84F" d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm4 72.6c-20.8 25-51.5 39.4-84 39.4s-63.2-14.3-84-39.4c-8.5-10.2-23.7-11.5-33.8-3.1-10.2 8.5-11.5 23.6-3.1 33.8 30 36 74.1 56.6 120.9 56.6s90.9-20.6 120.9-56.6c8.5-10.2 7.1-25.3-3.1-33.8-10.1-8.4-25.3-7.1-33.8 3.1z"></path></svg>';
const MEH =
  '<svg class="o-cf-icon meh" width="10" height="10" focusable="false" viewBox="0 0 496 512"><path fill="#F0AD4E" d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160-64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm8 144H160c-13.2 0-24 10.8-24 24s10.8 24 24 24h176c13.2 0 24-10.8 24-24s-10.8-24-24-24z"></path></svg>';
const FROWN =
  '<svg class="o-cf-icon frown" width="10" height="10" focusable="false" viewBox="0 0 496 512"><path fill="#E06666" d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160-64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm-80 128c-40.2 0-78 17.7-103.8 48.6-8.5 10.2-7.1 25.3 3.1 33.8 10.2 8.4 25.3 7.1 33.8-3.1 16.6-19.9 41-31.4 66.9-31.4s50.3 11.4 66.9 31.4c8.1 9.7 23.1 11.9 33.8 3.1 10.2-8.5 11.5-23.6 3.1-33.8C326 321.7 288.2 304 248 304z"></path></svg>';

const GREEN_DOT =
  '<svg class="o-cf-icon green-dot" width="10" height="10" focusable="false" viewBox="0 0 512 512"><path fill="#6AA84F" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"></path></svg>';
const YELLOW_DOT =
  '<svg class="o-cf-icon yellow-dot" width="10" height="10" focusable="false" viewBox="0 0 512 512"><path fill="#F0AD4E" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"></path></svg>';
const RED_DOT =
  '<svg class="o-cf-icon red-dot" width="10" height="10" focusable="false" viewBox="0 0 512 512"><path fill="#E06666" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"></path></svg>';

function loadIconImage(svg) {
  /** We have to add xmlns, as it's not added by owl in the canvas */
  svg = `<svg xmlns="http://www.w3.org/2000/svg" ${svg.slice(4)}`;
  const image = new Image();
  image.src = "data:image/svg+xml; charset=utf8, " + encodeURIComponent(svg);
  return image;
}

export const ICONS = {
  arrowGood: {
    template: "ARROW_UP",
    img: loadIconImage(ARROW_UP),
  },
  arrowNeutral: {
    template: "ARROW_RIGHT",
    img: loadIconImage(ARROW_RIGHT),
  },
  arrowBad: {
    template: "ARROW_DOWN",
    img: loadIconImage(ARROW_DOWN),
  },
  smileyGood: {
    template: "SMILE",
    img: loadIconImage(SMILE),
  },
  smileyNeutral: {
    template: "MEH",
    img: loadIconImage(MEH),
  },
  smileyBad: {
    template: "FROWN",
    img: loadIconImage(FROWN),
  },
  dotGood: {
    template: "GREEN_DOT",
    img: loadIconImage(GREEN_DOT),
  },
  dotNeutral: {
    template: "YELLOW_DOT",
    img: loadIconImage(YELLOW_DOT),
  },
  dotBad: {
    template: "RED_DOT",
    img: loadIconImage(RED_DOT),
  },
};

export const ICON_SETS = {
  arrows: {
    good: "arrowGood",
    neutral: "arrowNeutral",
    bad: "arrowBad",
  },
  smiley: {
    good: "smileyGood",
    neutral: "smileyNeutral",
    bad: "smileyBad",
  },
  dots: {
    good: "dotGood",
    neutral: "dotNeutral",
    bad: "dotBad",
  },
};
