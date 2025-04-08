import { StateObserver } from "../state_observer";
import { CoreCommand, CoreCommandDispatcher } from "../types/commands";
import { CoreGetters, PluginGetters, RangeAdapterGetters } from "../types/core_getters";
import { RangeAdapterFunctions, RangeProvider } from "../types/misc";
import { ModelConfig } from "../types/model";
import { UnionToIntersection } from "../types/utility";
import { WorkbookData } from "../types/workbook_data";
import { BasePlugin } from "./base_plugin";
import { RangeAdapterPlugin } from "./core/range";

/**
 * Type machinery for `DepsGetters<CorePlugin>` — the type of `this.getters` inside a core plugin.
 *
 * Goal: given a plugin class `CorePlugin`, produce an intersection of the getter types of every
 * plugin reachable through its `static dependencies` graph, plus `RangeAdapterGetters`.
 *
 * Pipeline (example: `MergePlugin` depends on `CellPlugin` which depends on `SheetPlugin`):
 *
 *   1. Reach<typeof MergePlugin>
 *        → typeof MergePlugin | typeof CellPlugin | typeof SheetPlugin   (union of all reachable ctors)
 *
 *   2. DistGetters<typeof MergePlugin | typeof CellPlugin | typeof SheetPlugin>
 *        → MergeGetters | CellGetters | SheetGetters                     (map each ctor to its getter type)
 *        The distributive conditional `T extends … ? PluginGetters<T> : never` is what makes
 *        TypeScript apply PluginGetters to each union member separately rather than to the whole union.
 *
 *   3. UnionToIntersection<MergeGetters | CellGetters | SheetGetters>
 *        → MergeGetters & CellGetters & SheetGetters                     (flip union → intersection)
 *
 *   4. RangeAdapterGetters & …                                           (always included)
 */

/** Transitive closure of the dependency graph: the plugin itself plus every dependency, recursively.
 *  D caps the recursivity to a given threshold. Resolves to `any` without it */
type Reach<P extends CorePluginConstructor, D extends unknown[] = []> = D extends { length: 8 }
  ? P
  : P | Reach<P["dependencies"][number], [...D, unknown]>;

/** Distributive map: turns a union of plugin constructors into a union of their getter types. */
type DistGetters<T extends CorePluginConstructor> = T extends CorePluginConstructor
  ? PluginGetters<T>
  : never;

/**
 * The type of `this.getters` inside a core plugin.
 * Automatically includes the getters of every plugin declared in `Class.dependencies`, transitively.
 */
export type DepsGetters<Plugin extends CorePluginConstructor> = RangeAdapterGetters &
  UnionToIntersection<DistGetters<Reach<Plugin>>>;

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
  new (config: CorePluginConfig): any;
  getters: readonly string[];
  readonly dependencies: readonly CorePluginConstructor[];
}

type MissingDependency = { readonly brand: unique symbol };

type ScopedGetters<Plugin extends CorePluginConstructor> = DepsGetters<Plugin> & {
  [key in Exclude<keyof CoreGetters, keyof DepsGetters<Plugin>>]: MissingDependency;
};

/**
 * Core plugins handle spreadsheet data.
 * They are responsible to import, export and maintain the spreadsheet
 * persisted state.
 * They should not be concerned about UI parts or transient state.
 */
export class CorePlugin<Self extends CorePluginConstructor, State = any>
  extends BasePlugin<State, CoreCommand>
  implements RangeProvider
{
  static readonly dependencies: readonly CorePluginConstructor[] = [];

  protected getters: ScopedGetters<Self>;
  protected dispatch: CoreCommandDispatcher["dispatch"];
  protected canDispatch: CoreCommandDispatcher["dispatch"];

  constructor({ getters, stateObserver, range, dispatch, canDispatch }: CorePluginConfig) {
    super(stateObserver);
    range.addRangeProvider(this.adaptRanges.bind(this));
    this.getters = getters as unknown as ScopedGetters<Self>;
    this.dispatch = dispatch;
    this.canDispatch = canDispatch;
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
}
