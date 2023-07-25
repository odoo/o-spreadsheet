import { Session } from "../collaborative/session";
import { ModelConfig } from "../model";
import { SelectionStreamProcessor } from "../selection_stream/selection_stream_processor";
import { StateObserver } from "../state_observer";
import {
  ClientPosition,
  Command,
  CommandDispatcher,
  Getters,
  GridRenderingContext,
  LAYERS,
} from "../types/index";
import { BasePlugin } from "./base_plugin";

export interface UIPluginConfig {
  readonly getters: Getters;
  readonly stateObserver: StateObserver;
  readonly dispatch: CommandDispatcher["dispatch"];
  readonly selection: SelectionStreamProcessor;
  readonly moveClient: (position: ClientPosition) => void;
  readonly custom: ModelConfig["custom"];
  readonly session: Session;
}

export interface UIPluginConstructor {
  new (config: UIPluginConfig): UIPlugin;
  layers: LAYERS[];
  getters: readonly string[];
}

/**
 * UI plugins handle any transient data required to display a spreadsheet.
 * They can draw on the grid canvas.
 */
export class UIPlugin<State = any, C = Command> extends BasePlugin<State, C> {
  static layers: LAYERS[] = [];

  protected getters: Getters;
  protected selection: SelectionStreamProcessor;
  constructor({ getters, stateObserver, dispatch, selection }: UIPluginConfig) {
    super(stateObserver, dispatch);
    this.getters = getters;
    this.selection = selection;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(ctx: GridRenderingContext, layer: LAYERS) {}
}
