import { UuidGenerator } from "../helpers";
import { ModelConfig } from "../model";
import { StateObserver } from "../state_observer";
import {
  ApplyRangeChange,
  ClipboardOptions,
  CoreCommand,
  CoreCommandDispatcher,
  RangeProvider,
  UID,
  WorkbookData,
  Zone,
} from "../types";
import { CoreGetters, Getters } from "../types/getters";
import { BasePlugin } from "./base_plugin";
import { RangeAdapter } from "./core/range";
import { ClipboardPlugin } from "./ui_stateful";

export interface CorePluginConfig {
  readonly getters: CoreGetters;
  readonly stateObserver: StateObserver;
  readonly range: RangeAdapter;
  readonly dispatch: CoreCommandDispatcher["dispatch"];
  readonly uuidGenerator: UuidGenerator;
  readonly custom: ModelConfig["custom"];
  readonly external: ModelConfig["external"];
  readonly clipboard: ClipboardPlugin;
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
  protected uuidGenerator: UuidGenerator;

  constructor({
    getters,
    stateObserver,
    range,
    dispatch,
    uuidGenerator,
    clipboard,
  }: CorePluginConfig) {
    super(stateObserver, dispatch);
    range.addRangeProvider(this.adaptRanges.bind(this));
    clipboard.addCopyProvider(this.copy.bind(this));
    clipboard.addPasteFigureProvider(this.pasteFigure.bind(this));
    clipboard.addPasteCellsProvider(this.pasteCells.bind(this));
    this.getters = getters;
    this.uuidGenerator = uuidGenerator;
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

  /**
   * TODO docstring
   * @param state
   */
  copy(getters: Getters, isCutOperation: boolean): void {}
  pasteFigure(sheetId: UID, position: { x: number; y: number }, content: any): void {}
  pasteCells(target: Zone[], options?: ClipboardOptions): void {}

  /**
   * Implement this method to clean unused external resources, such as images
   * stored on a server which have been deleted.
   */
  garbageCollectExternalResources() {}
}
