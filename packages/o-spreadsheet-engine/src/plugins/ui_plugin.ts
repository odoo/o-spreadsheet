import { Session } from "../collaborative/session";
import { StateObserver } from "../state_observer";
import { ClientPosition } from "../types/collaborative/session";
import { Command, CommandDispatcher, CommandResult, CoreCommand } from "../types/commands";
import { Currency } from "../types/currency";
import { Getters } from "../types/getters";
import { HistoryChange } from "../types/history2";
import { Color } from "../types/misc";
import { ModelConfig } from "../types/model";
import { GridRenderingContext, LayerName } from "../types/rendering";
import { SelectionStreamProcessor } from "../types/selection_stream_processor";
import { ExcelWorkbookData } from "../types/workbook_data";
import { BasePlugin } from "./base_plugin";

export type UIActions = Pick<ModelConfig, "notifyUI" | "raiseBlockingErrorUI">;

export interface UIPluginConfig {
  readonly getters: Getters;
  readonly stateObserver: StateObserver<CoreCommand, HistoryChange>;
  readonly dispatch: CommandDispatcher["dispatch"];
  readonly canDispatch: CommandDispatcher["dispatch"];
  readonly selection: SelectionStreamProcessor;
  readonly moveClient: (position: ClientPosition) => void;
  readonly uiActions: UIActions;
  readonly custom: ModelConfig["custom"];
  readonly session: Session;
  readonly defaultCurrency?: Partial<Currency>;
  readonly customColors: Color[];
  readonly external: ModelConfig["external"];
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
export class UIPlugin<State = any> extends BasePlugin<
  State,
  Command,
  CommandResult,
  HistoryChange,
  ExcelWorkbookData
> {
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
    super(stateObserver, CommandResult.Success);
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
