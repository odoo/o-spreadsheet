import { GridRenderingTheme } from "../..";
import { adaptForDarkMode } from "../../helpers/color";
import { Command } from "../../types/commands";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

const FROZEN_PANE_HEADER_BORDER_COLOR = "#BCBCBC";
const FROZEN_PANE_BORDER_COLOR = "#DADFE8";
const HEADER_BORDER_COLOR = "#C0C0C0";
const TEXT_HEADER_COLOR = "#666666";
const BACKGROUND_HEADER_COLOR = "#F8F9FA";
export const CELL_BORDER_COLOR = "#E2E3E3";
export const BACKGROUND_HEADER_SELECTED_COLOR = "#E8EAED";
export const BACKGROUND_HEADER_ACTIVE_COLOR = "#595959";

const COLOR_THEMES: Record<string, GridRenderingTheme> = {
  light: {
    backgroundColor: "#ffffff",
    gridBorderColor: CELL_BORDER_COLOR,
    headerBackgroundColor: BACKGROUND_HEADER_COLOR,
    headerActiveBackgroundColor: BACKGROUND_HEADER_ACTIVE_COLOR,
    headerSelectedBackgroundColor: BACKGROUND_HEADER_SELECTED_COLOR,
    headerTextColor: TEXT_HEADER_COLOR,
    headerBorderColor: HEADER_BORDER_COLOR,
    frozenPaneBorderColor: FROZEN_PANE_BORDER_COLOR,
    frozenPaneHeaderBorderColor: FROZEN_PANE_HEADER_BORDER_COLOR,
    singleCellSelectionBackgroundColor: "#f3f7fe",
    multipleCellsSelectionBackgroundColor: "#e9f0ff",
  },
  dark: {
    backgroundColor: adaptForDarkMode("#1a1c2e"),
    gridBorderColor: adaptForDarkMode("#4a4e55"),
    headerBackgroundColor: adaptForDarkMode("#262a36"),
    headerActiveBackgroundColor: adaptForDarkMode("#3a4052"),
    headerSelectedBackgroundColor: adaptForDarkMode("#4e566e"),
    headerTextColor: adaptForDarkMode("#a1a6b3"),
    headerBorderColor: adaptForDarkMode("#7a7f91"),
    frozenPaneBorderColor: adaptForDarkMode("#7a7f91"),
    frozenPaneHeaderBorderColor: adaptForDarkMode("#9fa5bd"),
    singleCellSelectionBackgroundColor: adaptForDarkMode("#696e8044"),
    multipleCellsSelectionBackgroundColor: adaptForDarkMode("#828aa044"),
  },
};
export class ColorThemeUIPlugin extends UIPlugin {
  static getters = ["isDarkMode", "getSpreadsheetTheme"] as const;
  private colorScheme?: "light" | "dark";

  constructor(config: UIPluginConfig) {
    super(config);
    this.colorScheme = config.colorScheme;
  }

  handle(command: Command): void {
    if (command.type === "UPDATE_COLOR_SCHEME") {
      this.colorScheme = command.colorScheme;
    }
  }

  isDarkMode(): boolean {
    return this.colorScheme === "dark";
  }

  /* This getters returns the colors to be used in the spreadsheet depending on the current theme (dark or light)
   * The colors are based on the default Odoo spreadsheet theme, but adapted for dark mode using the adaptForDarkMode
   * helper function that adjusts the color to obtain the desired color for elements that have a filter CSS properties.
   * These colors should then be used only on the elements that have the os-theme-dependant class, to avoid unexpected
   * colors inversion on other elements that don't have the filter CSS properties.
   */
  getSpreadsheetTheme(): GridRenderingTheme {
    switch (this.colorScheme) {
      case "dark":
        return COLOR_THEMES.dark;
      case "light":
      default:
        return COLOR_THEMES.light;
    }
  }
}
