import { DEFAULT_TABLE_CONFIG, TABLE_PRESETS } from "../../helpers/table_presets";
import { _t } from "../../translation";
import { CoreCommand, TableStyle, WorkbookData } from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface TableStylesState {
  readonly styles: { [styleId: string]: TableStyle };
}

export class TableStylePlugin extends CorePlugin<TableStylesState> implements TableStylesState {
  static getters = [
    "doesTableStyleExist",
    "getNewCustomTableStyleName",
    "getTableStyle",
    "getTableStyles",
    "isTableStyleEditable",
  ] as const;
  readonly styles: { [styleId: string]: TableStyle } = {};

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_TABLE_STYLE":
        this.history.update("styles", cmd.tableStyleId, cmd.tableStyle);
        break;
    }
  }

  doesTableStyleExist(styleId: string): boolean {
    return !!this.styles[styleId];
  }

  getTableStyle(styleId: string): TableStyle {
    // ADRM TOOD: do it good
    return this.styles[styleId] ?? this.styles[DEFAULT_TABLE_CONFIG.styleId];
  }

  getTableStyles(): Record<string, TableStyle> {
    return this.styles;
  }

  getNewCustomTableStyleName(): string {
    let name = _t("Custom Table Style");
    if (!this.styles[name]) {
      return name;
    }
    let i = 1;
    while (this.styles[`${name} ${i}`]) {
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
      this.styles[styleId] = data.customTableStyles[styleId];
    }
  }

  export(data: WorkbookData) {
    const exportedStyles: Record<string, TableStyle> = {};
    for (const styleId in this.styles) {
      if (!TABLE_PRESETS[styleId]) {
        exportedStyles[styleId] = this.styles[styleId];
      }
    }
    data.customTableStyles = exportedStyles;
  }
}
