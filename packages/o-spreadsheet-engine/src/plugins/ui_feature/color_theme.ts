import { Color, GridRenderingTheme } from "../..";
import { GRAY_900 } from "../../constants";
import { hexToHSLA, hslaToHex, toHex } from "../../helpers/color";
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

const darkColors: Map<Color, Color> = new Map();

export class ColorThemeUIPlugin extends UIPlugin {
  static getters = ["getAdaptedColor", "isDarkMode", "getSpreadsheetTheme"] as const;
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

  getAdaptedColor(color: Color): Color {
    if (!this.isDarkMode()) {
      return color;
    }
    if (!darkColors.has(color)) {
      const { h, s, l } = hexToHSLA(toHex(color));
      const darkColor = hslaToHex({ h, s, l: 100 - l, a: 1 });
      darkColors.set(color, darkColor);

      return darkColor;
    }
    return darkColors.get(color)!;
  }

  getSpreadsheetTheme(): GridRenderingTheme {
    const isDarkMode = this.isDarkMode();
    return {
      backgroundColor: isDarkMode ? "#dfe1ea" : "#ffffff",
      textColor: isDarkMode ? "#d1d5db" : "#000000",
      gridBorderColor: isDarkMode ? "#b3b5c3" : CELL_BORDER_COLOR,
      headerBackgroundColor: isDarkMode ? "#d1d5e1" : BACKGROUND_HEADER_COLOR,
      headerActiveBackgroundColor: isDarkMode ? "#c3cedfff" : BACKGROUND_HEADER_ACTIVE_COLOR,
      headerSelectedBackgroundColor: isDarkMode ? "#b7c1d1" : BACKGROUND_HEADER_SELECTED_COLOR,
      headerTextColor: isDarkMode ? GRAY_900 : TEXT_HEADER_COLOR,
      headerBorderColor: isDarkMode ? "#4b5563" : HEADER_BORDER_COLOR,
      frozenPaneBorderColor: isDarkMode ? "#4b5563" : FROZEN_PANE_BORDER_COLOR,
      frozenPaneHeaderBorderColor: isDarkMode ? "#4b5563" : FROZEN_PANE_HEADER_BORDER_COLOR,
      singleCellSelectionBackgroundColor: isDarkMode ? "#00008822" : "#f3f7fe",
      multipleCellsSelectionBackgroundColor: isDarkMode ? "#0000ff22" : "#e9f0ff",
    };
  }
}
