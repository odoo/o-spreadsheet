import { TABLE_PRESETS } from "../../helpers/table_presets";
import { CommandResult, CoreCommand, TableStyle, WorkbookData } from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface TableStylesState {
  readonly styles: { [styleId: string]: TableStyle };
}

export class TableStylePlugin extends CorePlugin<TableStylesState> implements TableStylesState {
  static getters = ["doesTableStyleExist", "getTableStyle", "getTableStyles"] as const;
  readonly styles: { [styleId: string]: TableStyle } = {};

  allowDispatch(cmd: CoreCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "UPDATE_TABLE":
        if (cmd.config?.styleId && !this.styles[cmd.config.styleId]) {
          return CommandResult.InvalidTableConfig;
        }
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
    }
  }

  doesTableStyleExist(styleId: string): boolean {
    return !!this.styles[styleId];
  }

  getTableStyle(styleId: string): TableStyle {
    if (!this.styles[styleId]) {
      throw new Error(`Table style with id ${styleId} does not exist`);
    }
    return this.styles[styleId];
  }

  getTableStyles(): Record<string, TableStyle> {
    return this.styles;
  }

  import(data: WorkbookData) {
    for (const presetStyleId in TABLE_PRESETS) {
      this.styles[presetStyleId] = TABLE_PRESETS[presetStyleId];
    }
  }
}
