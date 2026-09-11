import { ColorThemeName, GridRenderingTheme } from "../types/rendering";
import { adaptForDarkMode } from "./color";

const FROZEN_PANE_HEADER_BORDER_COLOR = "#BCBCBC";
const FROZEN_PANE_BORDER_COLOR = "#DADFE8";
const HEADER_BORDER_COLOR = "#C0C0C0";
const TEXT_HEADER_COLOR = "#666666";
const BACKGROUND_HEADER_COLOR = "#F8F9FA";
const BACKGROUND_HEADER_SELECTED_COLOR = "#E8EAED";
const BACKGROUND_HEADER_ACTIVE_COLOR = "#595959";

type ThemeColors = Omit<GridRenderingTheme, "colorThemeName">;

/**
 * Every colour of the theme is drawn on a surface carrying the `os-theme-dependant` class, so in
 * dark mode it goes through the dark mode CSS filter. The values below are therefore the colours we
 * want to *see*, and are pre-inverted in one pass so a new field cannot forget to be adapted.
 *
 * Note this only works because these colours are hand-picked: `adaptForDarkMode` is not a general
 * purpose converter (it clamps, see its docstring), so a colour chosen at runtime by someone else —
 * an integrator's background, for instance — cannot go through here. Those must not be drawn on the
 * canvas at all; see `--os-canvas-background-color`.
 */
function adaptColorsForDarkMode(colors: ThemeColors): ThemeColors {
  return Object.fromEntries(
    Object.entries(colors).map(([key, color]) => [key, adaptForDarkMode(color)])
  ) as ThemeColors;
}

const LIGHT_COLORS: ThemeColors = {
  chartBackgroundColor: "#FFFFFF",
  gridBorderColor: "#CECFCF",
  gridBorderColorOnDefaultBackground: "#E2E3E3",
  headerBackgroundColor: BACKGROUND_HEADER_COLOR,
  headerActiveBackgroundColor: BACKGROUND_HEADER_ACTIVE_COLOR,
  headerSelectedBackgroundColor: BACKGROUND_HEADER_SELECTED_COLOR,
  headerTextColor: TEXT_HEADER_COLOR,
  headerBorderColor: HEADER_BORDER_COLOR,
  frozenPaneBorderColor: FROZEN_PANE_BORDER_COLOR,
  frozenPaneHeaderBorderColor: FROZEN_PANE_HEADER_BORDER_COLOR,
  // Translucent so they composite over whatever is behind the cell, including the transparent
  // canvas. These composite over white to #F3F7FE and #E9F0FF, the opaque colours they replace.
  singleCellSelectionBackgroundColor: "#D2E1FB44",
  multipleCellsSelectionBackgroundColor: "#ACC7FF44",
};

/** Every colour defined explicitely in the theme is expected to be subject to color-inverter mask applied
 * through the css class `os-theme-dependant`. They are therefore pre-inverted for dark mode.
 * Note that  according to `adaptForDarkMode` documentation, the resulting color will be an approximation of the pre-inverted color.
 */
const DARK_DISPLAYED_COLORS: ThemeColors = {
  chartBackgroundColor: "#25262b",
  gridBorderColor: "#6B706F",
  gridBorderColorOnDefaultBackground: "#4F5254",
  headerBackgroundColor: "#262A36",
  headerActiveBackgroundColor: "#3A4052",
  headerSelectedBackgroundColor: "#4E566E",
  headerTextColor: "#A1A6B3",
  headerBorderColor: "#7A7F91",
  frozenPaneBorderColor: "#7A7F91",
  frozenPaneHeaderBorderColor: "#9FA5BD",
  singleCellSelectionBackgroundColor: "#696E8044",
  multipleCellsSelectionBackgroundColor: "#828AA044",
};

export const COLOR_THEMES: Record<ColorThemeName, GridRenderingTheme> = {
  light: { colorThemeName: "light", ...LIGHT_COLORS },
  dark: { colorThemeName: "dark", ...adaptColorsForDarkMode(DARK_DISPLAYED_COLORS) },
};
