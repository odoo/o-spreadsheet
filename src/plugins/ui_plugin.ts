import { Mode, ModelConfig } from "../model";
import { SelectionStreamProcessor } from "../selection_stream/selection_stream_processor";
import { StateObserver } from "../state_observer";
import { Command, CommandDispatcher, Getters, GridRenderingContext, LAYERS } from "../types/index";
import { BasePlugin } from "./base_plugin";

type UIActions = Pick<ModelConfig, "notifyUI">;
export interface UIPluginConstructor {
  new (
    getters: Getters,
    state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig,
    selection: SelectionStreamProcessor
  ): UIPlugin;
  layers: LAYERS[];
  getters: readonly string[];
  modes: Mode[];
}

/**
 * UI plugins handle any transient data required to display a spreadsheet.
 * They can draw on the grid canvas.
 */
export class UIPlugin<State = any, C = Command> extends BasePlugin<State, C> {
  static layers: LAYERS[] = [];

  protected getters: Getters;
  protected ui: UIActions;
  protected selection: SelectionStreamProcessor;
  constructor(
    getters: Getters,
    state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig,
    selection: SelectionStreamProcessor
  ) {
    super(state, dispatch, config);
    this.getters = getters;
    this.ui = config;
    this.selection = selection;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(ctx: GridRenderingContext, layer: LAYERS) {}
}
