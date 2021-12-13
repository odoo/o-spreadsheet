import { UuidGenerator } from "../helpers";
import { ModelConfig } from "../model";
import { StateObserver } from "../state_observer";
import { CoreCommand, CoreCommandDispatcher, ExcelWorkbookData, WorkbookData } from "../types";
import { CoreGetters } from "../types/getters";
import { BasePlugin } from "./base_plugin";
import { RangeAdapter } from "./core/range";

export interface CorePluginConstructor {
  new (
    getters: CoreGetters,
    stateObserver: StateObserver,
    range: RangeAdapter,
    dispatch: CoreCommandDispatcher["dispatch"],
    config: ModelConfig,
    uuidGenerator: UuidGenerator
  ): CorePlugin;
  getters: readonly string[];
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
    range: RangeAdapter,
    protected dispatch: CoreCommandDispatcher["dispatch"],
    config: ModelConfig,
    uuidGenerator: UuidGenerator
  ) {
    super(stateObserver, range, dispatch, config);
    this.range = range;
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
