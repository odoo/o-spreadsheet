import { WHistory } from "../history";
import { ModelConfig, Mode } from "../model";
import { CommandDispatcher, WorkbookData } from "../types";
import { Getters } from "../types/getters";
import { BasePlugin } from "./base_plugin";

export interface CorePluginConstructor {
  new (
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ): CorePlugin;
  getters: string[];
  modes: Mode[];
}

/**
 * Core plugins handle spreadsheet data.
 * They are responsible to import, export and maintain the spreadsheet
 * persisted state.
 * They should not be concerned about UI parts or transient state.
 */
export class CorePlugin<State = any> extends BasePlugin<State> {
  protected getters: Getters;

  constructor(
    getters: Getters,
    history: WHistory,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(history, dispatch, config);
    this.getters = getters;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
}
