import { StateReplicator2000 } from "../state_manager";
import { ModelConfig, Mode } from "../model";
import { CoreCommand, CoreCommandDispatcher, WorkbookData } from "../types";
import { CoreGetters } from "../types/getters";
import { BasePlugin } from "./base_plugin";

export interface CorePluginConstructor {
  new (
    getters: CoreGetters,
    history: StateReplicator2000,
    dispatch: CoreCommandDispatcher["dispatch"],
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
export class CorePlugin<State = any, C = CoreCommand> extends BasePlugin<State, C> {
  protected getters: CoreGetters;

  constructor(
    getters: CoreGetters,
    history: StateReplicator2000,
    protected dispatch: CoreCommandDispatcher["dispatch"],
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
