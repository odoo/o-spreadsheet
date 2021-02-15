import { WHistory } from "../history";
import { Mode, ModelConfig } from "../model";
import { ApplyRangeChange, CommandDispatcher, RangeProvider, UID, WorkbookData } from "../types";
import { CoreGetters } from "../types/getters";
import { BasePlugin } from "./base_plugin";
import { RangeAdapter } from "./core/range";

export interface CorePluginConstructor {
  new (
    getters: CoreGetters,
    history: WHistory,
    range: RangeAdapter,
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
export class CorePlugin<State = any> extends BasePlugin<State> implements RangeProvider {
  protected getters: CoreGetters;
  protected range: RangeAdapter;

  constructor(
    getters: CoreGetters,
    history: WHistory,
    range: RangeAdapter,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(history, dispatch, config);
    this.range = range;
    range.addRangeProvider(this.adaptRanges.bind(this));
    this.getters = getters;
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
   * @param sheetId an optional sheetId to adapt either range of that sheet specifically, or ranges pointing to that sheet
   */
  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID): void {}
}
