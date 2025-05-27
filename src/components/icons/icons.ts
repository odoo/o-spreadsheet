import {
  ACTION_COLOR,
  FILTERS_COLOR,
  GRAY_200,
  GRAY_300,
  GRAY_900,
  ICON_EDGE_LENGTH,
  TEXT_BODY_MUTED,
} from "../../constants";
import { isDefined } from "../../helpers";
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
  paths: [
    {
      fillColor: "#E06666",
      path: "M413.1 222.5l22.2 22.2c9.4 9.4 9.4 24.6 0 33.9L241 473c-9.4 9.4-24.6 9.4-33.9 0L12.7 278.6c-9.4-9.4-9.4-24.6 0-33.9l22.2-22.2c9.5-9.5 25-9.3 34.3.4L184 343.4V56c0-13.3 10.7-24 24-24h32c13.3 0 24 10.7 24 24v287.4l114.8-120.5c9.3-9.8 24.8-10 34.3-.4z",
    },
  ],
};
const ARROW_UP: ImageSVG = {
  width: 448,
  height: 512,
  paths: [
    {
      fillColor: "#6AA84F",
      path: "M34.9 289.5l-22.2-22.2c-9.4-9.4-9.4-24.6 0-33.9L207 39c9.4-9.4 24.6-9.4 33.9 0l194.3 194.3c9.4 9.4 9.4 24.6 0 33.9L413 289.4c-9.5 9.5-25 9.3-34.3-.4L264 168.6V456c0 13.3-10.7 24-24 24h-32c-13.3 0-24-10.7-24-24V168.6L69.2 289.1c-9.3 9.8-24.8 10-34.3.4z",
    },
  ],
};
const ARROW_RIGHT: ImageSVG = {
  width: 448,
  height: 512,
  paths: [
    {
      fillColor: "#F0AD4E",
      path: "M190.5 66.9l22.2-22.2c9.4-9.4 24.6-9.4 33.9 0L441 239c9.4 9.4 9.4 24.6 0 33.9L246.6 467.3c-9.4 9.4-24.6 9.4-33.9 0l-22.2-22.2c-9.5-9.5-9.3-25 .4-34.3L311.4 296H24c-13.3 0-24-10.7-24-24v-32c0-13.3 10.7-24 24-24h287.4L190.9 101.2c-9.8-9.3-10-24.8-.4-34.3z",
    },
  ],
};

const SMILE: ImageSVG = {
  width: 496,
  height: 512,
  paths: [
    {
      fillColor: "#6AA84F",
      path: "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm4 72.6c-20.8 25-51.5 39.4-84 39.4s-63.2-14.3-84-39.4c-8.5-10.2-23.7-11.5-33.8-3.1-10.2 8.5-11.5 23.6-3.1 33.8 30 36 74.1 56.6 120.9 56.6s90.9-20.6 120.9-56.6c8.5-10.2 7.1-25.3-3.1-33.8-10.1-8.4-25.3-7.1-33.8 3.1z",
    },
  ],
};
const MEH: ImageSVG = {
  width: 496,
  height: 512,
  paths: [
    {
      fillColor: "#F0AD4E",
      path: "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160-64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm8 144H160c-13.2 0-24 10.8-24 24s10.8 24 24 24h176c13.2 0 24-10.8 24-24s-10.8-24-24-24z",
    },
  ],
};
const FROWN: ImageSVG = {
  width: 496,
  height: 512,
  paths: [
    {
      fillColor: "#E06666",
      path: "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm0 448c-110.3 0-200-89.7-200-200S137.7 56 248 56s200 89.7 200 200-89.7 200-200 200zm-80-216c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32zm160-64c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm-80 128c-40.2 0-78 17.7-103.8 48.6-8.5 10.2-7.1 25.3 3.1 33.8 10.2 8.4 25.3 7.1 33.8-3.1 16.6-19.9 41-31.4 66.9-31.4s50.3 11.4 66.9 31.4c8.1 9.7 23.1 11.9 33.8 3.1 10.2-8.5 11.5-23.6 3.1-33.8C326 321.7 288.2 304 248 304z",
    },
  ],
};

const DOT_PATH = "M256 9 a247 247 0 1 0.1 0 0";
const GREEN_DOT: ImageSVG = {
  width: 512,
  height: 512,
  paths: [{ fillColor: "#6AA84F", path: DOT_PATH }],
};
const YELLOW_DOT: ImageSVG = {
  width: 512,
  height: 512,
  paths: [{ fillColor: "#F0AD4E", path: DOT_PATH }],
};
const RED_DOT: ImageSVG = {
  width: 512,
  height: 512,
  paths: [{ fillColor: "#E06666", path: DOT_PATH }],
};

export const CARET_DOWN: ImageSVG = {
  width: 512,
  height: 512,
  paths: [{ fillColor: TEXT_BODY_MUTED, path: "M120 195 h270 l-135 130" }],
};

export const HOVERED_CARET_DOWN: ImageSVG = {
  width: 512,
  height: 512,
  paths: [
    { fillColor: TEXT_BODY_MUTED, path: "M15 15 h482 v482 h-482" },
    { fillColor: "#fff", path: "M120 195 h270 l-135 130" },
  ],
};

export const CHECKBOX_UNCHECKED: ImageSVG = {
  width: 512,
  height: 512,
  paths: [{ fillColor: GRAY_300, path: "M45,45 h422 v422 h-422 v-422 m30,30 v362 h362 v-362" }],
};

export const CHECKBOX_UNCHECKED_HOVERED: ImageSVG = {
  width: 512,
  height: 512,
  paths: [{ fillColor: ACTION_COLOR, path: "M45,45 h422 v422 h-422 v-422 m30,30 v362 h362 v-362" }],
};

export const CHECKBOX_CHECKED: ImageSVG = {
  width: 512,
  height: 512,
  paths: [
    { fillColor: ACTION_COLOR, path: "M45,45 h422 v422 h-422 v-422" },
    { fillColor: "#FFF", path: "M165,240 l45,45 l135,-135 h60 l-195,195 l-105,-105" },
  ],
};

export function getPivotIconSvg(isCollapsed: boolean, isHovered: boolean): ImageSVG {
  const symbolPath = isCollapsed
    ? "M149,235 h213 v43 h-213 M235,149 h43 v213 h-43" // +
    : "M149,235 h213 v43 h-213"; // -

  return {
    width: 512,
    height: 512,
    paths: [
      { path: "M21,21 h469 v469 h-469", fillColor: isHovered ? GRAY_900 : "#777" }, // borders
      { path: "M64,64 v384 h384 v-384", fillColor: isHovered ? GRAY_200 : "#eee" }, // background
      { path: symbolPath, fillColor: isHovered ? GRAY_900 : "#777" },
    ],
  };
}

export function getDataFilterIcon(
  isActive: boolean,
  isHighContrast: boolean,
  isHovered: boolean
): ImageSVG {
  const symbolPath = isActive
    ? "M18.6 3.5H4.29c-.7 0-1.06.85-.56 1.35l6.1 6.1v6.8c0 .26.13.5.34.65l2.64 1.85a.79.79 0 0 0 1.25-.65v-8.64l6.1-6.1a.79.79 0 0 0-.56-1.35"
    : "M 339.667 681 L 510.333 681 L 510.333 595.667 L 339.667 595.667 L 339.667 681 Z M 41 169 L 41 254.333 L 809 254.333 L 809 169 L 41 169 Z M 169 467.667 L 681 467.667 L 681 382.333 L 169 382.333 L 169 467.667 Z";

  const hoverBackgroundPath = isActive ? "M0,0 h24 v24 h-24" : "M0,0 h850 v850 h-850";

  const colors = { iconColor: FILTERS_COLOR, hoverBackgroundColor: FILTERS_COLOR };
  if (isHovered && !isHighContrast) {
    colors.iconColor = "#fff";
  } else if (!isHovered && isHighContrast) {
    colors.iconColor = "#defade";
  } else if (isHovered && isHighContrast) {
    colors.iconColor = FILTERS_COLOR;
    colors.hoverBackgroundColor = "#fff";
  }

  return {
    width: isActive ? 24 : 850,
    height: isActive ? 24 : 850,
    paths: [
      isHovered ? { path: hoverBackgroundPath, fillColor: colors.hoverBackgroundColor } : undefined,
      { path: symbolPath, fillColor: colors.iconColor },
    ].filter(isDefined),
  };
}

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
