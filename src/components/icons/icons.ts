import { ICON_EDGE_LENGTH } from "../../constants";
import { iconsOnCellRegistry } from "../../registries/icons_on_cell_registry";
import { ImageSVG } from "../../types/image";
import { css } from "../helpers";

css/* scss */ `
  .o-spreadsheet {
    .o-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${ICON_EDGE_LENGTH}px;
      height: ${ICON_EDGE_LENGTH}px;
      font-size: ${ICON_EDGE_LENGTH}px;
      vertical-align: middle;

      .small-text {
        font: bold 9px sans-serif;
      }
      .heavy-text {
        font: bold 16px sans-serif;
      }
    }
    .fa-small {
      font-size: 14px;
    }
  }
`;

export type IconSetType = keyof typeof ICON_SETS;

// -----------------------------------------------------------------------------
// We need here the svg of the icons that we need to convert to images for the renderer
// -----------------------------------------------------------------------------
const ARROW_DOWN: ImageSVG = {
  width: 448,
  height: 512,
  fillColor: "#E06666",
  path: "M413.1 222.5l22.2 22.2c9.4 9.4 9.4 24.6 0 33.9L241 473c-9.4 9.4-24.6 9.4-33.9 0L12.7 278.6c-9.4-9.4-9.4-24.6 0-33.9l22.2-22.2c9.5-9.5 25-9.3 34.3.4L184 343.4V56c0-13.3 10.7-24 24-24h32c13.3 0 24 10.7 24 24v287.4l114.8-120.5c9.3-9.8 24.8-10 34.3-.4z",
};
const ARROW_UP: ImageSVG = {
  width: 448,
  height: 512,
  fillColor: "#6AA84F",
  path: "M34.9 289.5l-22.2-22.2c-9.4-9.4-9.4-24.6 0-33.9L207 39c9.4-9.4 24.6-9.4 33.9 0l194.3 194.3c9.4 9.4 9.4 24.6 0 33.9L413 289.4c-9.5 9.5-25 9.3-34.3-.4L264 168.6V456c0 13.3-10.7 24-24 24h-32c-13.3 0-24-10.7-24-24V168.6L69.2 289.1c-9.3 9.8-24.8 10-34.3.4z",
};
const ARROW_RIGHT: ImageSVG = {
  width: 448,
  height: 512,
  fillColor: "#F0AD4E",
  path: "M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L441 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4 9.4-24.6 9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z",
};

const SMILE: ImageSVG = {
  width: 496,
  height: 512,
  fillColor: "#6AA84F",
  path: "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm4 72.6c-20.8 25-51.5 39.4-84 39.4s-63.2-14.3-84-39.4c-8.5-10.2-23.7-11.5-33.8-3.1-10.2 8.5-11.5 23.6-3.1 33.8 30 36 74.1 56.6 120.9 56.6s90.9-20.6 120.9-56.6c8.5-10.2 7.1-25.3-3.1-33.8-10.1-8.4-25.3-7.1-33.8 3.1z",
};
const MEH: ImageSVG = {
  width: 496,
  height: 512,
  fillColor: "#F0AD4E",
  path: "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160-64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm8 144H160c-13.2 0-24 10.8-24 24s10.8 24 24 24h176c13.2 0 24-10.8 24-24s-10.8-24-24-24z",
};
const FROWN: ImageSVG = {
  width: 496,
  height: 512,
  fillColor: "#E06666",
  path: "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160-64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm-80 128c-40.2 0-78 17.7-103.8 48.6-8.5 10.2-7.1 25.3 3.1 33.8 10.2 8.4 25.3 7.1 33.8-3.1 16.6-19.9 41-31.4 66.9-31.4s50.3 11.4 66.9 31.4c8.1 9.7 23.1 11.9 33.8 3.1 10.2-8.5 11.5-23.6 3.1-33.8C326 321.7 288.2 304 248 304z",
};

const DOT_PATH = "M256 9 a247 247 0 1 0.1 0 0";
const GREEN_DOT: ImageSVG = {
  width: 512,
  height: 512,
  fillColor: "#6AA84F",
  path: DOT_PATH,
};
const YELLOW_DOT: ImageSVG = {
  width: 512,
  height: 512,
  fillColor: "#F0AD4E",
  path: DOT_PATH,
};
const RED_DOT: ImageSVG = {
  width: 512,
  height: 512,
  fillColor: "#E06666",
  path: DOT_PATH,
};

export const ICONS: Record<
  string,
  {
    template: string;
    svg: ImageSVG;
  }
> = {
  arrowGood: {
    template: "ARROW_UP",
    svg: ARROW_UP,
  },
  arrowNeutral: {
    template: "ARROW_RIGHT",
    svg: ARROW_RIGHT,
  },
  arrowBad: {
    template: "ARROW_DOWN",
    svg: ARROW_DOWN,
  },
  smileyGood: {
    template: "SMILE",
    svg: SMILE,
  },
  smileyNeutral: {
    template: "MEH",
    svg: MEH,
  },
  smileyBad: {
    template: "FROWN",
    svg: FROWN,
  },
  dotGood: {
    template: "GREEN_DOT",
    svg: GREEN_DOT,
  },
  dotNeutral: {
    template: "YELLOW_DOT",
    svg: YELLOW_DOT,
  },
  dotBad: {
    template: "RED_DOT",
    svg: RED_DOT,
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

iconsOnCellRegistry.add("conditional_formatting", (getters, position) => {
  const icon = getters.getConditionalIcon(position);
  if (icon) {
    return ICONS[icon].svg;
  }
  return undefined;
});
