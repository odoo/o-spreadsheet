import { UuidGenerator } from "../helpers";
import { ModelConfig } from "../model";
import { StateObserver } from "../state_observer";
import {
  ApplyRangeChange,
  CoreCommand,
  CoreCommandDispatcher,
  ExcelWorkbookData,
  RangeProvider,
  UID,
  WorkbookData,
} from "../types";
import { CoreGetters } from "../types/getters";
import { BasePlugin } from "./base_plugin";
import { RangeAdapter } from "./core/range";
import { HeaderMap, HeaderMapManager } from "./header_map";

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
export class CorePlugin<State = any, C = CoreCommand>
  extends BasePlugin<State, C>
  implements RangeProvider
{
  protected getters: CoreGetters;
  protected range: RangeAdapter;
  protected uuidGenerator: UuidGenerator;

  constructor(
    getters: CoreGetters,
    stateObserver: StateObserver,
    range: RangeAdapter,
    protected dispatch: CoreCommandDispatcher["dispatch"],
    config: ModelConfig,
    uuidGenerator: UuidGenerator
  ) {
    super(stateObserver, dispatch, config);
    this.range = range;

    range.addRangeProvider(this.adaptRanges.bind(this));
    this.getters = getters;
    this.uuidGenerator = uuidGenerator;
  }

  protected newHeaderMap<T>(): HeaderMap<T> {
    return new HeaderMapManager<T>(this.stateObserver, this.range);
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData) {}
  exportForExcel(data: ExcelWorkbookData) {}

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
