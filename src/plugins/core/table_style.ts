import { toHex } from "../../helpers";
import {
  DEFAULT_TABLE_CONFIG,
  TABLE_PRESETS,
  TABLE_STYLES_TEMPLATES,
  buildTableStyle as buildCustomTableStyle,
} from "../../helpers/table_presets";
import { _t } from "../../translation";
import {
  CommandResult,
  CoreCommand,
  TableStyle,
  TableStyleData,
  WorkbookData,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface TableStylesState {
  readonly styles: { [styleId: string]: TableStyle };
}

export class TableStylePlugin extends CorePlugin<TableStylesState> implements TableStylesState {
  static getters = [
    "getNewCustomTableStyleName",
    "getTableStyle",
    "getTableStyles",
    "isTableStyleEditable",
  ] as const;
  readonly styles: { [styleId: string]: TableStyle } = {};

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "CREATE_TABLE":
      case "UPDATE_TABLE":
        if (cmd.config?.styleId && !this.styles[cmd.config.styleId]) {
          return CommandResult.InvalidTableConfig;
        }
        break;
      case "CREATE_TABLE_STYLE":
        if (!TABLE_STYLES_TEMPLATES[cmd.templateName]) {
          return CommandResult.InvalidTableStyle;
        }
        try {
          toHex(cmd.primaryColor);
        } catch (e) {
          return CommandResult.InvalidTableStyle;
        }
        break;
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_TABLE_STYLE":
        const style = buildCustomTableStyle(cmd.tableStyleName, cmd.templateName, cmd.primaryColor);
        this.history.update("styles", cmd.tableStyleId, style);
        break;
      case "REMOVE_TABLE_STYLE":
        const styles = { ...this.styles };
        delete styles[cmd.tableStyleId];
        this.history.update("styles", styles);
        for (const sheetId of this.getters.getSheetIds()) {
          for (const table of this.getters.getCoreTables(sheetId)) {
            if (table.config.styleId === cmd.tableStyleId) {
              this.dispatch("UPDATE_TABLE", {
                sheetId,
                zone: table.range.zone,
                config: { styleId: DEFAULT_TABLE_CONFIG.styleId },
              });
            }
          }
        }
        break;
    }
  }

  getTableStyle(styleId: string): TableStyle {
    if (!this.styles[styleId]) {
      throw new Error(`Table style ${styleId} does not exist`);
    }
    return this.styles[styleId];
  }

  getTableStyles(): Record<string, TableStyle> {
    return this.styles;
  }

  getNewCustomTableStyleName(): string {
    let name = _t("Custom Table Style");
    const styleNames = new Set(Object.values(this.styles).map((style) => style.displayName));
    if (!styleNames.has(name)) {
      return name;
    }
    let i = 2;
    while (styleNames.has(`${name} ${i}`)) {
      i++;
    }
    return `${name} ${i}`;
  }

  isTableStyleEditable(styleId: string): boolean {
    return !TABLE_PRESETS[styleId];
  }

  import(data: WorkbookData) {
    for (const presetStyleId in TABLE_PRESETS) {
      this.styles[presetStyleId] = TABLE_PRESETS[presetStyleId];
    }
    for (const styleId in data.customTableStyles) {
      const styleData = data.customTableStyles[styleId];
      this.styles[styleId] = buildCustomTableStyle(
        styleData.displayName,
        styleData.templateName,
        styleData.primaryColor
      );
    }
  }

  export(data: WorkbookData) {
    const exportedStyles: Record<string, TableStyleData> = {};
    for (const styleId in this.styles) {
      if (!TABLE_PRESETS[styleId]) {
        exportedStyles[styleId] = {
          displayName: this.styles[styleId].displayName,
          templateName: this.styles[styleId].templateName,
          primaryColor: this.styles[styleId].primaryColor,
        };
      }
    }
    data.customTableStyles = exportedStyles;
  }
}
