import { COLOR_THEMES } from "../../helpers/color_themes";
import { Command } from "../../types/commands";
import { ColorThemeName, GridRenderingTheme } from "../../types/rendering";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

export class ColorThemeUIPlugin extends UIPlugin {
  static getters = ["isDarkMode", "getSpreadsheetTheme"] as const;
  private colorScheme?: ColorThemeName;

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
