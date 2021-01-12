import { ModelConfig, Mode } from "../model";
import { StateObserver } from "../state_observer";
import { CoreCommand, CoreCommandDispatcher, WorkbookData } from "../types";
import { CoreGetters } from "../types/getters";
import { BasePlugin } from "./base_plugin";

export interface CorePluginConstructor {
  new (
    getters: CoreGetters,
    stateObserver: StateObserver,
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
    stateObserver: StateObserver,
    protected dispatch: CoreCommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(stateObserver, dispatch, config);
    this.getters = getters;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
}
