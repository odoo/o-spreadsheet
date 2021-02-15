import { WHistory } from "../history";
import { Mode, ModelConfig } from "../model";
import { CommandDispatcher, WorkbookData } from "../types";
import { CoreGetters } from "../types/getters";
import { BasePlugin } from "./base_plugin";
import { RangePlugin } from "./core/range";

export interface CorePluginConstructor {
  new (
    getters: CoreGetters,
    history: WHistory,
    range: RangePlugin,
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
  protected getters: CoreGetters;

  constructor(
    getters: CoreGetters,
    history: WHistory,
    range: RangePlugin,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(history, range, dispatch, config);
    this.getters = getters;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
}
