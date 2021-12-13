import { UuidGenerator } from "../helpers";
import { Mode, ModelConfig } from "../model";
import { StateObserver } from "../state_observer";
import { CoreCommand, CoreCommandDispatcher, ExcelWorkbookData, WorkbookData } from "../types";
import { CoreGetters } from "../types/getters";
import { BasePlugin } from "./base_plugin";

export interface CorePluginConstructor {
  new (
    getters: CoreGetters,
    stateObserver: StateObserver,
    dispatch: CoreCommandDispatcher["dispatch"],
    config: ModelConfig,
    uuidGenerator: UuidGenerator
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
  protected uuidGenerator: UuidGenerator;

  constructor(
    getters: CoreGetters,
    stateObserver: StateObserver,
    protected dispatch: CoreCommandDispatcher["dispatch"],
    config: ModelConfig,
    uuidGenerator: UuidGenerator
  ) {
    super(stateObserver, dispatch, config);
    this.getters = getters;
    this.uuidGenerator = uuidGenerator;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
  exportForExcel(data: ExcelWorkbookData) {}
}
