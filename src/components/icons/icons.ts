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
  '<svg class="o-cf-icon arrow-down" width="10" height="10" focusable="false" viewBox="0 0 448 512"><path fill="#DC6965" d="M413.1 222.5l22.2 22.2c9.4 9.4 9.4 24.6 0 33.9L241 473c-9.4 9.4-24.6 9.4-33.9 0L12.7 278.6c-9.4-9.4-9.4-24.6 0-33.9l22.2-22.2c9.5-9.5 25-9.3 34.3.4L184 343.4V56c0-13.3 10.7-24 24-24h32c13.3 0 24 10.7 24 24v287.4l114.8-120.5c9.3-9.8 24.8-10 34.3-.4z"></path></svg>';
const ARROW_UP =
  '<svg class="o-cf-icon arrow-up" width="10" height="10" focusable="false" viewBox="0 0 448 512"><path fill="#00A04A" d="M34.9 289.5l-22.2-22.2c-9.4-9.4-9.4-24.6 0-33.9L207 39c9.4-9.4 24.6-9.4 33.9 0l194.3 194.3c9.4 9.4 9.4 24.6 0 33.9L413 289.4c-9.5 9.5-25 9.3-34.3-.4L264 168.6V456c0 13.3-10.7 24-24 24h-32c-13.3 0-24-10.7-24-24V168.6L69.2 289.1c-9.3 9.8-24.8 10-34.3.4z"></path></svg>';
const ARROW_RIGHT =
  '<svg class="o-cf-icon arrow-right" width="10" height="10" focusable="false" viewBox="0 0 448 512"><path fill="#F0AD4E" d="M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L441 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4 9.4-24.6 9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z"></path></svg>';

const SMILE =
  '<svg class="o-cf-icon smile" width="10" height="10" focusable="false" viewBox="0 0 496 512"><path fill="#00A04A" d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm4 72.6c-20.8 25-51.5 39.4-84 39.4s-63.2-14.3-84-39.4c-8.5-10.2-23.7-11.5-33.8-3.1-10.2 8.5-11.5 23.6-3.1 33.8 30 36 74.1 56.6 120.9 56.6s90.9-20.6 120.9-56.6c8.5-10.2 7.1-25.3-3.1-33.8-10.1-8.4-25.3-7.1-33.8 3.1z"></path></svg>';
const MEH =
  '<svg class="o-cf-icon meh" width="10" height="10" focusable="false" viewBox="0 0 496 512"><path fill="#F0AD4E" d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160-64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm8 144H160c-13.2 0-24 10.8-24 24s10.8 24 24 24h176c13.2 0 24-10.8 24-24s-10.8-24-24-24z"></path></svg>';
const FROWN =
  '<svg class="o-cf-icon frown" width="10" height="10" focusable="false" viewBox="0 0 496 512"><path fill="#DC6965" d="M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160-64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm-80 128c-40.2 0-78 17.7-103.8 48.6-8.5 10.2-7.1 25.3 3.1 33.8 10.2 8.4 25.3 7.1 33.8-3.1 16.6-19.9 41-31.4 66.9-31.4s50.3 11.4 66.9 31.4c8.1 9.7 23.1 11.9 33.8 3.1 10.2-8.5 11.5-23.6 3.1-33.8C326 321.7 288.2 304 248 304z"></path></svg>';

const GREEN_DOT =
  '<svg class="o-cf-icon green-dot" width="10" height="10" focusable="false" viewBox="0 0 512 512"><path fill="#00A04A" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"></path></svg>';
const YELLOW_DOT =
  '<svg class="o-cf-icon yellow-dot" width="10" height="10" focusable="false" viewBox="0 0 512 512"><path fill="#F0AD4E" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"></path></svg>';
const RED_DOT =
  '<svg class="o-cf-icon red-dot" width="10" height="10" focusable="false" viewBox="0 0 512 512"><path fill="#DC6965" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"></path></svg>';
const CHECKBOX_CHECKED =
  '<svg width="24" height="24" viewBox="0 0 24 24"><g id="ic_fluent_checkbox_checked_24_regular" fill="#212121" fill-rule="nonzero"><path d="M18.25,3 C19.7687831,3 21,4.23121694 21,5.75 L21,18.25 C21,19.7687831 19.7687831,21 18.25,21 L5.75,21 C4.23121694,21 3,19.7687831 3,18.25 L3,5.75 C3,4.23121694 4.23121694,3 5.75,3 L18.25,3 Z M18.25,4.5 L5.75,4.5 C5.05964406,4.5 4.5,5.05964406 4.5,5.75 L4.5,18.25 C4.5,18.9403559 5.05964406,19.5 5.75,19.5 L18.25,19.5 C18.9403559,19.5 19.5,18.9403559 19.5,18.25 L19.5,5.75 C19.5,5.05964406 18.9403559,4.5 18.25,4.5 Z M10,14.4393398 L16.4696699,7.96966991 C16.7625631,7.6767767 17.2374369,7.6767767 17.5303301,7.96966991 C17.7965966,8.23593648 17.8208027,8.65260016 17.6029482,8.94621165 L17.5303301,9.03033009 L10.5303301,16.0303301 C10.2640635,16.2965966 9.84739984,16.3208027 9.55378835,16.1029482 L9.46966991,16.0303301 L6.46966991,13.0303301 C6.1767767,12.7374369 6.1767767,12.2625631 6.46966991,11.9696699 C6.73593648,11.7034034 7.15260016,11.6791973 7.44621165,11.8970518 L7.53033009,11.9696699 L10,14.4393398 L16.4696699,7.96966991 L10,14.4393398 Z"></path></g></svg>';
const CHECKBOX_UNCHECKED =
  '<svg width="24" height="24" viewBox="0 0 24 24" ><g id="ic_fluent_checkbox_unchecked_24_regular" fill="#212121" fill-rule="nonzero"><path d="M5.75,3 L18.25,3 C19.7687831,3 21,4.23121694 21,5.75 L21,18.25 C21,19.7687831 19.7687831,21 18.25,21 L5.75,21 C4.23121694,21 3,19.7687831 3,18.25 L3,5.75 C3,4.23121694 4.23121694,3 5.75,3 Z M5.75,4.5 C5.05964406,4.5 4.5,5.05964406 4.5,5.75 L4.5,18.25 C4.5,18.9403559 5.05964406,19.5 5.75,19.5 L18.25,19.5 C18.9403559,19.5 19.5,18.9403559 19.5,18.25 L19.5,5.75 C19.5,5.05964406 18.9403559,4.5 18.25,4.5 L5.75,4.5 Z"></path></g></svg>';

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
  checkbox: {
    template: "CHECKBOX_CHECKED",
    img: loadIconImage(CHECKBOX_CHECKED),
  },
  unchecked: {
    template: "CHECKBOX_UNCHECKED",
    img: loadIconImage(CHECKBOX_UNCHECKED),
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
