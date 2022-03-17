import { _lt } from "./translation";
import { BorderDescr, Style } from "./types";

// Scheduler
export const MAXIMUM_EVALUATION_CHECK_DELAY_MS = 15;

// Colors
export const BACKGROUND_GRAY_COLOR = "#f5f5f5";
export const BACKGROUND_HEADER_COLOR = "#F8F9FA";
export const BACKGROUND_HEADER_SELECTED_COLOR = "#E8EAED";
export const BACKGROUND_HEADER_ACTIVE_COLOR = "#595959";
export const TEXT_HEADER_COLOR = "#666666";
export const SELECTION_BORDER_COLOR = "#3266ca";
export const HEADER_BORDER_COLOR = "#C0C0C0";
export const CELL_BORDER_COLOR = "#E2E3E3";
export const BACKGROUND_CHART_COLOR = "#FFFFFF";
export const MENU_ITEM_DISABLED_COLOR = "#CACACA";

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
export const PADDING_AUTORESIZE = 3;
export const AUTOFILL_EDGE_LENGTH = 8;
export const ICON_EDGE_LENGTH = 18;
export const UNHIDE_ICON_EDGE_LENGTH = 14;
export const MIN_CF_ICON_MARGIN = 4;
export const MIN_CELL_TEXT_MARGIN = 4;
export const CF_ICON_EDGE_LENGTH = 15;

export const LINK_TOOLTIP_HEIGHT = 43.5;
export const LINK_TOOLTIP_WIDTH = 220;

// Menus
export const MENU_WIDTH = 200;
export const MENU_VERTICAL_PADDING = 8;
export const MENU_ITEM_HEIGHT = 24;
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

// Style
export const DEFAULT_STYLE: Style = {
  fillColor: "white",
  textColor: "black",
  fontSize: DEFAULT_FONT_SIZE,
};
export const LINK_COLOR = "#00f";
// DateTimeRegex
export const DATETIME_FORMAT = /[ymd:]/;

// Ranges
export const INCORRECT_RANGE_STRING = "#REF";

// Max Number of history steps kept in memory
export const MAX_HISTORY_STEPS = 99;

// Id of the first revision
export const DEFAULT_REVISION_ID = "START_REVISION";

// Chart
export const MAX_CHAR_LABEL = 20;

export const DEBOUNCE_TIME = 200;

export const MESSAGE_VERSION = 1;

export const LOADING = "Loading...";

export const DEFAULT_ERROR_MESSAGE = _lt("Invalid expression");

export const FORBIDDEN_SHEET_CHARS = ["'", "*", "?", "/", "\\", "[", "]"] as const;
export const FORBIDDEN_IN_EXCEL_REGEX = /'|\*|\?|\/|\\|\[|\]/;

// Cells
export const NULL_FORMAT = undefined;

export const FORMULA_REF_IDENTIFIER = "|";
