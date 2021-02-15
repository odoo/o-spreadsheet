import { WHistory } from "../history";
import { Mode, ModelConfig } from "../model";
import { CommandDispatcher, Getters, GridRenderingContext, LAYERS } from "../types/index";
import { BasePlugin } from "./base_plugin";
import { RangePlugin } from "./core/range";

type UIActions = Pick<ModelConfig, "askConfirmation" | "notifyUser" | "openSidePanel" | "editText">;

export interface UIPluginConstructor {
  new (
    getters: Getters,
    history: WHistory,
    range: RangePlugin,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ): UIPlugin;
  layers: LAYERS[];
  getters: string[];
  modes: Mode[];
}

/**
 * UI plugins handle any transient data required to display a spreadsheet.
 * They can draw on the grid canvas.
 */
export class UIPlugin<State = any> extends BasePlugin {
  static layers: LAYERS[] = [];

  protected getters: Getters;
  protected ui: UIActions;

  constructor(
    getters: Getters,
    history: WHistory,
    range: RangePlugin,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(history, range, dispatch, config);
    this.getters = getters;
    this.ui = config;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(ctx: GridRenderingContext, layer: LAYERS) {}
}
