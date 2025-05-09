import { BorderDescr, Color, Currency, Style } from "./types";

export const CANVAS_SHIFT = 0.5;

// Colors
export const HIGHLIGHT_COLOR = "#37A850";
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
export const DISABLED_TEXT_COLOR = "#CACACA";
export const DEFAULT_COLOR_SCALE_MIDPOINT_COLOR = 0xb6d7a8;
export const LINK_COLOR = "#017E84";
export const FILTERS_COLOR = "#188038";
export const BACKGROUND_HEADER_FILTER_COLOR = "#E6F4EA";
export const SEPARATOR_COLOR = "#E0E2E4";
export const ICONS_COLOR = "#4A4F59";
export const HEADER_GROUPING_BACKGROUND_COLOR = "#F5F5F5";
export const HEADER_GROUPING_BORDER_COLOR = "#999";
export const GRID_BORDER_COLOR = "#E2E3E3";
export const FROZEN_PANE_HEADER_BORDER_COLOR = "#BCBCBC";
export const FROZEN_PANE_BORDER_COLOR = "#DADFE8";
export const COMPOSER_ASSISTANT_COLOR = "#9B359B";

export const CHART_WATERFALL_POSITIVE_COLOR = "#4EA7F2";
export const CHART_WATERFALL_NEGATIVE_COLOR = "#EA6175";
export const CHART_WATERFALL_SUBTOTAL_COLOR = "#AAAAAA";

export const GRAY_900 = "#111827";
export const GRAY_300 = "#D8DADD";
export const GRAY_200 = "#E7E9ED";
export const GRAY_100 = "#F9FAFB";
export const TEXT_BODY = "#374151";
export const TEXT_BODY_MUTED = TEXT_BODY + "C2";
export const TEXT_HEADING = "#111827";
export const PRIMARY_BUTTON_BG = "#714B67";
export const PRIMARY_BUTTON_HOVER_BG = "#624159";
export const PRIMARY_BUTTON_ACTIVE_BG = "#f1edf0";
export const BUTTON_BG = GRAY_200;
export const BUTTON_HOVER_BG = GRAY_300;
export const BUTTON_HOVER_TEXT_COLOR = "#111827";
export const BUTTON_ACTIVE_BG = "#e6f2f3";
export const BUTTON_ACTIVE_TEXT_COLOR = "#111827";
export const ACTION_COLOR = "#017E84";
export const ACTION_COLOR_HOVER = "#01585c";
export const ALERT_WARNING_BG = "#FBEBCC";
export const ALERT_WARNING_BORDER = "#F8E2B3";
export const ALERT_WARNING_TEXT_COLOR = "#946D23";
export const ALERT_DANGER_BG = "#D44C591A";
export const ALERT_DANGER_BORDER = "#C34A41";
export const ALERT_DANGER_TEXT_COLOR = "#C34A41";
export const ALERT_INFO_BG = "#CDEDF1";
export const ALERT_INFO_BORDER = "#98DBE2";
export const ALERT_INFO_TEXT_COLOR = "#09414A";
export const BADGE_SELECTED_COLOR = "#E6F2F3";

export const DEFAULT_CHART_PADDING = 20;
export const DEFAULT_CHART_FONT_SIZE = 22;

export const SCORECARD_GAUGE_CHART_PADDING = 10;
export const SCORECARD_GAUGE_CHART_FONT_SIZE = 14;

// Color picker defaults as upper case HEX to match `toHex`helper
export const COLOR_PICKER_DEFAULTS: Color[] = [
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
export const TOPBAR_TOOLBAR_HEIGHT = 34;
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
export const GROUP_LAYER_WIDTH = 21;
export const GRID_ICON_MARGIN = 2;
export const GRID_ICON_EDGE_LENGTH = 17;
export const FILTER_ICON_MARGIN = 2;
export const FILTER_ICON_EDGE_LENGTH = 17;
export const FOOTER_HEIGHT = 2 * DEFAULT_CELL_HEIGHT;

// Menus
export const MENU_WIDTH = 250;
export const MENU_VERTICAL_PADDING = 6;
export const MENU_ITEM_HEIGHT = 26;
export const MENU_ITEM_PADDING_HORIZONTAL = 11;
export const MENU_ITEM_PADDING_VERTICAL = 4;
export const MENU_SEPARATOR_BORDER_WIDTH = 1;
export const MENU_SEPARATOR_PADDING = 5;
export const MENU_SEPARATOR_HEIGHT = MENU_SEPARATOR_BORDER_WIDTH + 2 * MENU_SEPARATOR_PADDING;

// Style
export const DEFAULT_STYLE = {
  align: "left",
  verticalAlign: "bottom",
  wrapping: "overflow",
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  fontSize: 10,
  fillColor: "",
  textColor: "",
} satisfies Required<Style>;

export const DEFAULT_VERTICAL_ALIGN = DEFAULT_STYLE.verticalAlign;
export const DEFAULT_WRAPPING_MODE = DEFAULT_STYLE.wrapping;

// Fonts
export const DEFAULT_FONT_WEIGHT = "400";
export const DEFAULT_FONT_SIZE = DEFAULT_STYLE.fontSize;
export const HEADER_FONT_SIZE = 11;
export const DEFAULT_FONT = "'Roboto', arial";

// Borders
export const DEFAULT_BORDER_DESC: BorderDescr = { style: "thin", color: "#000000" };
export const DEFAULT_FILTER_BORDER_DESC: BorderDescr = { style: "thin", color: FILTERS_COLOR };

// Max Number of history steps kept in memory
export const MAX_HISTORY_STEPS = 99;

// Id of the first revision
export const DEFAULT_REVISION_ID = "START_REVISION";

// Figure
export const DEFAULT_FIGURE_HEIGHT = 335;
export const DEFAULT_FIGURE_WIDTH = 536;
export const FIGURE_BORDER_WIDTH = 1;
export const ACTIVE_BORDER_WIDTH = 2;
export const MIN_FIG_SIZE = 80;

// Chart
export const MAX_CHAR_LABEL = 20;
export const FIGURE_ID_SPLITTER = "??";

export const DEFAULT_GAUGE_LOWER_COLOR = "#EA6175";
export const DEFAULT_GAUGE_MIDDLE_COLOR = "#FFD86D";
export const DEFAULT_GAUGE_UPPER_COLOR = "#43C5B1";

export const DEFAULT_SCORECARD_BASELINE_MODE = "difference";
export const DEFAULT_SCORECARD_BASELINE_COLOR_UP = "#43C5B1";
export const DEFAULT_SCORECARD_BASELINE_COLOR_DOWN = "#EA6175";

export const LINE_FILL_TRANSPARENCY = 0.4;

// session
export const DEBOUNCE_TIME = 200;
export const MESSAGE_VERSION = 1;

// Sheets
export const FORBIDDEN_SHEETNAME_CHARS = ["'", "*", "?", "/", "\\", "[", "]"] as const;
export const FORBIDDEN_SHEETNAME_CHARS_IN_EXCEL_REGEX = /'|\*|\?|\/|\\|\[|\]/;

// Cells
export const FORMULA_REF_IDENTIFIER = "|";
export const LOADING = "Loading...";

// Components
export enum ComponentsImportance {
  Grid = 0,
  Highlight = 5,
  HeaderGroupingButton = 6,
  Figure = 10,
  ScrollBar = 15,
  GridPopover = 19,
  GridComposer = 20,
  Dropdown = 21,
  IconPicker = 25,
  TopBarComposer = 30,
  Popover = 35,
  FigureAnchor = 1000,
  FigureSnapLine = 1001,
}
let DEFAULT_SHEETVIEW_SIZE = 0;

export function getDefaultSheetViewSize() {
  return DEFAULT_SHEETVIEW_SIZE;
}

export function setDefaultSheetViewSize(size: number) {
  DEFAULT_SHEETVIEW_SIZE = size;
}

export const MAXIMAL_FREEZABLE_RATIO = 0.85;

export const NEWLINE = "\n";
export const FONT_SIZES: number[] = [6, 7, 8, 9, 10, 11, 12, 14, 18, 24, 36];

// Pivot
export const PIVOT_TABLE_CONFIG = {
  hasFilters: false,
  totalRow: false,
  firstColumn: true,
  lastColumn: false,
  numberOfHeaders: 1,
  bandedRows: true,
  bandedColumns: false,
  styleId: "TableStyleMedium5",
  automaticAutofill: false,
};

export const DEFAULT_CURRENCY: Currency = {
  symbol: "$",
  position: "before",
  decimalPlaces: 2,
  code: "",
  name: "Dollar",
};
