import { ColorThemeName, GridRenderingTheme } from "../types/rendering";
import { adaptForDarkMode } from "./color";

const FROZEN_PANE_HEADER_BORDER_COLOR = "#BCBCBC";
const FROZEN_PANE_BORDER_COLOR = "#DADFE8";
const HEADER_BORDER_COLOR = "#C0C0C0";
const TEXT_HEADER_COLOR = "#666666";
const BACKGROUND_HEADER_COLOR = "#F8F9FA";
const BACKGROUND_HEADER_SELECTED_COLOR = "#E8EAED";
const BACKGROUND_HEADER_ACTIVE_COLOR = "#595959";

export const COLOR_THEMES: Record<ColorThemeName, GridRenderingTheme> = {
  light: {
    colorThemeName: "light",
    backgroundColor: "#FFFFFF",
    gridBorderColor: "#CECFCF",
    headerBackgroundColor: BACKGROUND_HEADER_COLOR,
    headerActiveBackgroundColor: BACKGROUND_HEADER_ACTIVE_COLOR,
    headerSelectedBackgroundColor: BACKGROUND_HEADER_SELECTED_COLOR,
    headerTextColor: TEXT_HEADER_COLOR,
    headerBorderColor: HEADER_BORDER_COLOR,
    frozenPaneBorderColor: FROZEN_PANE_BORDER_COLOR,
    frozenPaneHeaderBorderColor: FROZEN_PANE_HEADER_BORDER_COLOR,
    singleCellSelectionBackgroundColor: "#F3F7FE",
    multipleCellsSelectionBackgroundColor: "#E9F0FF",
  },
  dark: {
    colorThemeName: "dark",
    backgroundColor: adaptForDarkMode("#1A1C2E"),
    gridBorderColor: adaptForDarkMode("#6B706F"),
    headerBackgroundColor: adaptForDarkMode("#262A36"),
    headerActiveBackgroundColor: adaptForDarkMode("#3A4052"),
    headerSelectedBackgroundColor: adaptForDarkMode("#4E566E"),
    headerTextColor: adaptForDarkMode("#A1A6B3"),
    headerBorderColor: adaptForDarkMode("#7A7F91"),
    frozenPaneBorderColor: adaptForDarkMode("#7A7F91"),
    frozenPaneHeaderBorderColor: adaptForDarkMode("#9FA5BD"),
    singleCellSelectionBackgroundColor: adaptForDarkMode("#696E8044"),
    multipleCellsSelectionBackgroundColor: adaptForDarkMode("#828AA044"),
  },
};
