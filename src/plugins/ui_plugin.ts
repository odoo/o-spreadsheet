import { BasePlugin, StateObserver } from "@odoo/o-spreadsheet-engine";
import { Session } from "@odoo/o-spreadsheet-engine/collaborative/session";
import { ModelConfig } from "@odoo/o-spreadsheet-engine/types/model";
import { SelectionStreamProcessor } from "@odoo/o-spreadsheet-engine/types/selection_stream_processor";
import {
  ClientPosition,
  Color,
  Command,
  CommandDispatcher,
  CommandResult,
  CoreCommand,
  Currency,
  ExcelWorkbookData,
  Getters,
  GridRenderingContext,
  HistoryChange,
  LayerName,
} from "../types/index";

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
