import { WHistory } from "../history";
import { Mode, ModelConfig } from "../model";
import { CommandDispatcher, Getters, GridRenderingContext, LAYERS } from "../types/index";
import { BasePlugin } from "./base_plugin";

type UIActions = Pick<ModelConfig, "askConfirmation" | "notifyUser" | "openSidePanel" | "editText">;

export interface UIPluginConstuctor {
  new (
    getters: Getters,
    history: WHistory,
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
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(history, dispatch, config);
    this.getters = getters;
    this.ui = config;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(ctx: GridRenderingContext, layer: LAYERS) {}
}
