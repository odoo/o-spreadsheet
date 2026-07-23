import { StateObserver } from "../state_observer";
import { CommandTypes, CoreCommand, CoreCommandDispatcher } from "../types/commands";
import { CoreGetters } from "../types/core_getters";
import { FormulaOwnerRecord } from "../types/formula_owner";
import { RangeAdapterFunctions, RangeProvider } from "../types/misc";
import { ModelConfig } from "../types/model";
import { WorkbookData } from "../types/workbook_data";
import { BasePlugin } from "./base_plugin";
import { FormulaOwnerRegistry } from "./core/formula_owner_registry";
import { RangeAdapterPlugin } from "./core/range";

export interface CorePluginConfig {
  readonly getters: CoreGetters;
  readonly stateObserver: StateObserver;
  readonly range: RangeAdapterPlugin;
  readonly formulaOwners: FormulaOwnerRegistry;
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

  constructor({
    getters,
    stateObserver,
    range,
    formulaOwners,
    dispatch,
    canDispatch,
  }: CorePluginConfig) {
    super(stateObserver);
    this.getters = getters;
    this.dispatch = dispatch;
    this.canDispatch = canDispatch;
    range.addRangeProvider(this.adaptRanges.bind(this));
    formulaOwners.addProvider(this.getFormulaOwners.bind(this));
    formulaOwners.addExtraInvalidationCommands(this.getExtraInvalidationCommands());
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {}
  export(data: WorkbookData, shouldSquish: boolean) {}

  /**
   * This method can be implemented in any plugin, to loop over the plugin's data structure and adapt the plugin's ranges.
   * To adapt them, the implementation of the function must have a perfect knowledge of the data structure, thus
   * implementing the loops over it makes sense in the plugin itself.
   * When calling the method applyChange, the range will be adapted if necessary, then a copy will be returned along with
   * the type of change that occurred.
   *
   * @param rangeAdapterFunctions a function that, when called, will adapt the range according to the change on the grid
   * @param sheetId an sheetId to adapt either range of that sheet specifically, or ranges pointing to that sheet
   * @param sheetName couple of old and new sheet names to adapt ranges pointing to that sheet
   */
  adaptRanges(rangeAdapterFunctions: RangeAdapterFunctions): void {}

  /**
   * Override to declare, in a pull-based way, the formulas this plugin
   * currently owns outside a cell (e.g. a conditional formatting rule's
   * custom formula). This is queried by `FormulaManagerPlugin` whenever a
   * relevant command is dispatched — there is no push/registration call to
   * make elsewhere, the returned list should always reflect current truth.
   */
  getFormulaOwners(): Iterable<FormulaOwnerRecord> {
    return [];
  }

  /**
   * Override to declare extra command types (beyond the shared default set)
   * that should make `FormulaManagerPlugin` re-pull this plugin's formula
   * owners. Called exactly once, at construction time — this is a static
   * property of the plugin's command-handling logic (which of its own
   * commands add/remove/change formula-bearing state), not something that
   * changes over its lifetime, so it must not depend on any instance state
   * that isn't already available in the constructor.
   */
  getExtraInvalidationCommands(): Iterable<CommandTypes> {
    return [];
  }
}
