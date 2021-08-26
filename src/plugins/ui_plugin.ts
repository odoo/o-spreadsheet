import { Mode, ModelConfig } from "../model";
import { StateObserver } from "../state_observer";
import {
  Command,
  CommandDispatcher,
  Getters,
  LAYERS,
  PluginRenderingContext,
} from "../types/index";
import { BasePlugin } from "./base_plugin";

type UIActions = Pick<
  ModelConfig,
  "askConfirmation" | "notifyUser" | "openSidePanel" | "editText" | "trigger"
>;

export interface UIPluginConstructor {
  new (
    getters: Getters,
    state: StateObserver,
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
export class UIPlugin<State = any, C = Command> extends BasePlugin<State, C> {
  static layers: LAYERS[] = [];

  protected getters: Getters;
  protected ui: UIActions;

  constructor(
    getters: Getters,
    state: StateObserver,
    dispatch: CommandDispatcher["dispatch"],
    config: ModelConfig
  ) {
    super(state, dispatch, config);
    this.getters = getters;
    this.ui = config;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(ctx: PluginRenderingContext[], layer: LAYERS) {}
}
