import { _lt } from "./translation";
import { BorderDescr } from "./types";
import { CellErrorType } from "./types/errors";

export const CANVAS_SHIFT = 0.5;

// Colors
export const BACKGROUND_GRAY_COLOR = "#f5f5f5";
export const BACKGROUND_HEADER_COLOR = "#F8F9FA";
export const BACKGROUND_HEADER_SELECTED_COLOR = "#E8EAED";
export const BACKGROUND_HEADER_ACTIVE_COLOR = "#595959";
export const TEXT_HEADER_COLOR = "#666666";
export const FIGURE_BORDER_COLOR = "#c9ccd2";
export const SELECTION_BORDER_COLOR = "#3266ca";
export const HEADER_BORDER_COLOR = "#C0C0C0";
export const CELL_BORDER_COLOR = "#E2E3E3";
export const BACKGROUND_CHART_COLOR = "#FFFFFF";
export const MENU_ITEM_DISABLED_COLOR = "#CACACA";
export const DEFAULT_COLOR_SCALE_MIDPOINT_COLOR = 0xb6d7a8;
export const LINK_COLOR = "#01666b";
export const FILTERS_COLOR = "#188038";
export const BACKGROUND_HEADER_FILTER_COLOR = "#E6F4EA";
export const BACKGROUND_HEADER_SELECTED_FILTER_COLOR = "#CEEAD6";

// Color picker
export const COLOR_PICKER_DEFAULTS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#cccccc",
  "#d9d9d9",
  "#efefef",
  "#f3f3f3",
  "#ffffff",
  "#980000",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#e6b8af",
  "#f4cccc",
  "#fce5cd",
  "#fff2cc",
  "#d9ead3",
  "#d0e0e3",
  "#c9daf8",
  "#cfe2f3",
  "#d9d2e9",
  "#ead1dc",
  "#dd7e6b",
  "#ea9999",
  "#f9cb9c",
  "#ffe599",
  "#b6d7a8",
  "#a2c4c9",
  "#a4c2f4",
  "#9fc5e8",
  "#b4a7d6",
  "#d5a6bd",
  "#cc4125",
  "#e06666",
  "#f6b26b",
  "#ffd966",
  "#93c47d",
  "#76a5af",
  "#6d9eeb",
  "#6fa8dc",
  "#8e7cc3",
  "#c27ba0",
  "#a61c00",
  "#cc0000",
  "#e69138",
  "#f1c232",
  "#6aa84f",
  "#45818e",
  "#3c78d8",
  "#3d85c6",
  "#674ea7",
  "#a64d79",
  "#85200c",
  "#990000",
  "#b45f06",
  "#bf9000",
  "#38761d",
  "#134f5c",
  "#1155cc",
  "#0b5394",
  "#351c75",
  "#741b47",
  "#5b0f00",
  "#660000",
  "#783f04",
  "#7f6000",
  "#274e13",
  "#0c343d",
  "#1c4587",
  "#073763",
  "#20124d",
  "#4c1130",
];

// Dimensions
export const MIN_ROW_HEIGHT = 10;
export const MIN_COL_WIDTH = 5;
export const HEADER_HEIGHT = 26;
export const HEADER_WIDTH = 48;
export const TOPBAR_HEIGHT = 63;
export const BOTTOMBAR_HEIGHT = 36;
export const DEFAULT_CELL_WIDTH = 96;
export const DEFAULT_CELL_HEIGHT = 23;
export const SCROLLBAR_WIDTH = 15;
export const AUTOFILL_EDGE_LENGTH = 8;
export const ICON_EDGE_LENGTH = 18;
export const UNHIDE_ICON_EDGE_LENGTH = 14;
export const MIN_CF_ICON_MARGIN = 4;
export const MIN_CELL_TEXT_MARGIN = 4;
export const CF_ICON_EDGE_LENGTH = 15;
export const PADDING_AUTORESIZE_VERTICAL = 3;
export const PADDING_AUTORESIZE_HORIZONTAL = MIN_CELL_TEXT_MARGIN;
export const FILTER_ICON_MARGIN = 2;
export const FILTER_ICON_EDGE_LENGTH = 17;

// Menus
export const MENU_WIDTH = 250;
export const MENU_ITEM_HEIGHT = 28;
export const MENU_SEPARATOR_BORDER_WIDTH = 1;
export const MENU_SEPARATOR_PADDING = 5;
export const MENU_SEPARATOR_HEIGHT = MENU_SEPARATOR_BORDER_WIDTH + 2 * MENU_SEPARATOR_PADDING;

export const FIGURE_BORDER_SIZE = 1;

// Fonts
export const DEFAULT_FONT_WEIGHT = "400";
export const DEFAULT_FONT_SIZE = 10;
export const HEADER_FONT_SIZE = 11;
export const DEFAULT_FONT = "'Roboto', arial";

// Borders
export const DEFAULT_BORDER_DESC: BorderDescr = ["thin", "#000"];
export const DEFAULT_FILTER_BORDER_DESC: BorderDescr = ["thin", FILTERS_COLOR];

// DateTimeRegex
export const DATETIME_FORMAT = /[ymd:]/;

// Ranges
export const INCORRECT_RANGE_STRING = CellErrorType.InvalidReference;

// Max Number of history steps kept in memory
export const MAX_HISTORY_STEPS = 99;

// Id of the first revision
export const DEFAULT_REVISION_ID = "START_REVISION";

// Figure
export const DEFAULT_FIGURE_HEIGHT = 335;
export const DEFAULT_FIGURE_WIDTH = 536;

// Chart
export const MAX_CHAR_LABEL = 20;
export const FIGURE_ID_SPLITTER = "??";

export const DEFAULT_GAUGE_LOWER_COLOR = "#cc0000";
export const DEFAULT_GAUGE_MIDDLE_COLOR = "#f1c232";
export const DEFAULT_GAUGE_UPPER_COLOR = "#6aa84f";

export const LINE_FILL_TRANSPARENCY = 0.4;

export const MIN_FIG_SIZE = 80;

// session
export const DEBOUNCE_TIME = 200;
export const MESSAGE_VERSION = 1;

// Sheets
export const FORBIDDEN_SHEET_CHARS = ["'", "*", "?", "/", "\\", "[", "]"] as const;
export const FORBIDDEN_IN_EXCEL_REGEX = /'|\*|\?|\/|\\|\[|\]/;

// Cells
export const NULL_FORMAT = undefined;
export const FORMULA_REF_IDENTIFIER = "|";
export const LOADING = "Loading...";
export const DEFAULT_ERROR_MESSAGE = _lt("Invalid expression");

// Components
export enum ComponentsImportance {
  Grid = 0,
  Highlight = 5,
  Figure = 10,
  ScrollBar = 15,
  GridPopover = 19,
  GridComposer = 20,
  Dropdown = 21,
  ColorPicker = 25,
  IconPicker = 25,
  TopBarComposer = 30,
  Popover = 35,
  ChartAnchor = 1000,
}

export const DEFAULT_SHEETVIEW_SIZE = 1000;

export const MAXIMAL_FREEZABLE_RATIO = 0.85;
