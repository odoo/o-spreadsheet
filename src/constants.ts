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

// Color picker defaults as upper case HEX to match `toHex`helper
export const COLOR_PICKER_DEFAULTS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#B7B7B7",
  "#CCCCCC",
  "#D9D9D9",
  "#EFEFEF",
  "#F3F3F3",
  "#FFFFFF",
  "#980000",
  "#FF0000",
  "#FF9900",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#4A86E8",
  "#0000FF",
  "#9900FF",
  "#FF00FF",
  "#E6B8AF",
  "#F4CCCC",
  "#FCE5CD",
  "#FFF2CC",
  "#D9EAD3",
  "#D0E0E3",
  "#C9DAF8",
  "#CFE2F3",
  "#D9D2E9",
  "#EAD1DC",
  "#DD7E6B",
  "#EA9999",
  "#F9CB9C",
  "#FFE599",
  "#B6D7A8",
  "#A2C4C9",
  "#A4C2F4",
  "#9FC5E8",
  "#B4A7D6",
  "#D5A6BD",
  "#CC4125",
  "#E06666",
  "#F6B26B",
  "#FFD966",
  "#93C47D",
  "#76A5AF",
  "#6D9EEB",
  "#6FA8DC",
  "#8E7CC3",
  "#C27BA0",
  "#A61C00",
  "#CC0000",
  "#E69138",
  "#F1C232",
  "#6AA84F",
  "#45818E",
  "#3C78D8",
  "#3D85C6",
  "#674EA7",
  "#A64D79",
  "#85200C",
  "#990000",
  "#B45F06",
  "#BF9000",
  "#38761D",
  "#134F5C",
  "#1155CC",
  "#0B5394",
  "#351C75",
  "#741B47",
  "#5B0F00",
  "#660000",
  "#783F04",
  "#7F6000",
  "#274E13",
  "#0C343D",
  "#1C4587",
  "#073763",
  "#20124D",
  "#4C1130",
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
export const DATETIME_FORMAT = /[ymdhs:]/;

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
