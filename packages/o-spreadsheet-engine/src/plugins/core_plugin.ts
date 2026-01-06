import { StateObserver } from "../state_observer";
import { CoreCommand, CoreCommandDispatcher } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { AdaptSheetName, RangeAdapterFunctions, RangeProvider, UID } from "../types/misc";
import { ModelConfig } from "../types/model";
import { WorkbookData } from "../types/workbook_data";
import { BasePlugin } from "./base_plugin";
import { RangeAdapterPlugin } from "./core/range";

export interface CorePluginConfig {
  readonly getters: CoreGetters;
  readonly stateObserver: StateObserver;
  readonly range: RangeAdapterPlugin;
  readonly dispatch: CoreCommandDispatcher["dispatch"];
  readonly canDispatch: CoreCommandDispatcher["dispatch"];
  readonly custom: ModelConfig["custom"];
  readonly external: ModelConfig["external"];
}

export interface CorePluginConstructor {
  new (config: CorePluginConfig): CorePlugin;
  getters: readonly string[];
}

/**
 * Core plugins handle spreadsheet data.
 * They are responsible to import, export and maintain the spreadsheet
 * persisted state.
 * They should not be concerned about UI parts or transient state.
 */
export class CorePlugin<State = any>
  extends BasePlugin<State, CoreCommand>
  implements RangeProvider
{
  protected getters: CoreGetters;
  protected dispatch: CoreCommandDispatcher["dispatch"];
  protected canDispatch: CoreCommandDispatcher["dispatch"];

  constructor({ getters, stateObserver, range, dispatch, canDispatch }: CorePluginConfig) {
    super(stateObserver);
    range.addRangeProvider(this.adaptRanges.bind(this));
    this.getters = getters;
    this.dispatch = dispatch;
    this.canDispatch = canDispatch;
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}

  /**
   * This method can be implemented in any plugin, to loop over the plugin's data structure and adapt the plugin's ranges.
   * To adapt them, the implementation of the function must have a perfect knowledge of the data structure, thus
   * implementing the loops over it makes sense in the plugin itself.
   * When calling the method applyChange, the range will be adapted if necessary, then a copy will be returned along with
   * the type of change that occurred.
   *
   * @param applyChange a function that, when called, will adapt the range according to the change on the grid
   * @param sheetId an sheetId to adapt either range of that sheet specifically, or ranges pointing to that sheet
   * @param sheetName couple of old and new sheet names to adapt ranges pointing to that sheet
   */
  adaptRanges(
    rangeAdapterFunctions: RangeAdapterFunctions,
    sheetId: UID,
    sheetName: AdaptSheetName
  ): void {}
}
