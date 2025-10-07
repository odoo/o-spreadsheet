import { BasePlugin, StateObserver } from "@odoo/o-spreadsheet-engine";
import { Session } from "@odoo/o-spreadsheet-engine/collaborative/session";
import { ModelConfig } from "@odoo/o-spreadsheet-engine/types/model";
import { SelectionStreamProcessor } from "../selection_stream/selection_stream_processor";
import {
  ClientPosition,
  Color,
  Command,
  CommandResult,
  CoreCommand,
  Currency,
  ExcelWorkbookData,
  Getters,
  HistoryChange,
} from "../types/index";
import { UIActions } from "./ui_plugin";

export interface CoreViewPluginConfig {
  readonly getters: Getters;
  readonly stateObserver: StateObserver<CoreCommand, HistoryChange>;
  readonly selection: SelectionStreamProcessor;
  readonly moveClient: (position: ClientPosition) => void;
  readonly uiActions: UIActions;
  readonly custom: ModelConfig["custom"];
  readonly session: Session;
  readonly defaultCurrency?: Partial<Currency>;
  readonly customColors: Color[];
  readonly external: ModelConfig["external"];
}

export interface CoreViewPluginConstructor {
  new (config: CoreViewPluginConfig): CoreViewPlugin;
  getters: readonly string[];
}

/**
 * Core view plugins handle any data derived from core date (i.e. evaluation).
 * They cannot impact the model data (i.e. cannot dispatch commands).
 */
export class CoreViewPlugin<State = any> extends BasePlugin<
  State,
  Command,
  CommandResult,
  HistoryChange,
  ExcelWorkbookData
> {
  protected getters: Getters;
  constructor({ getters, stateObserver }: CoreViewPluginConfig) {
    super(stateObserver, CommandResult.Success);
    this.getters = getters;
  }
}
