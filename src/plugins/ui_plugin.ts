import { Session } from "../collaborative/session";
import { ModelConfig } from "../model";
import { SelectionStreamProcessor } from "../selection_stream/selection_stream_processor";
import { StateObserver } from "../state_observer";
import {
  ClientPosition,
  Color,
  Command,
  CommandDispatcher,
  Currency,
  Getters,
  GridRenderingContext,
  LayerName,
} from "../types/index";
import { BasePlugin } from "./base_plugin";

export type UIActions = Pick<ModelConfig, "notifyUI" | "raiseBlockingErrorUI">;

export interface UIPluginConfig {
  readonly getters: Getters;
  readonly stateObserver: StateObserver;
  readonly dispatch: CommandDispatcher["dispatch"];
  readonly canDispatch: CommandDispatcher["dispatch"];
  readonly selection: SelectionStreamProcessor;
  readonly moveClient: (position: ClientPosition) => void;
  readonly uiActions: UIActions;
  readonly custom: ModelConfig["custom"];
  readonly session: Session;
  readonly defaultCurrency?: Partial<Currency>;
  readonly customColors: Color[];
}

export interface UIPluginConstructor {
  new (config: UIPluginConfig): UIPlugin;
  layers: Readonly<LayerName[]>;
  getters: readonly string[];
}

/**
 * UI plugins handle any transient data required to display a spreadsheet.
 * They can draw on the grid canvas.
 */
export class UIPlugin<State = any> extends BasePlugin<State, Command> {
  static layers: Readonly<LayerName[]> = [];

  protected getters: Getters;
  protected ui: UIActions;
  protected selection: SelectionStreamProcessor;
  protected dispatch: CommandDispatcher["dispatch"];
  protected canDispatch: CommandDispatcher["dispatch"];

  constructor({
    getters,
    stateObserver,
    dispatch,
    canDispatch,
    uiActions,
    selection,
  }: UIPluginConfig) {
    super(stateObserver);
    this.getters = getters;
    this.ui = uiActions;
    this.selection = selection;
    this.dispatch = dispatch;
    this.canDispatch = canDispatch;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawLayer(ctx: GridRenderingContext, layer: LayerName) {}
}
