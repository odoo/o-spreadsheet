import { Session } from "../collaborative/session";
import { ModelConfig } from "../model";
import { SelectionStreamProcessor } from "../selection_stream/selection_stream_processor";
import { StateObserver } from "../state_observer";
import { ClientPosition, Color, Command, Currency, Getters } from "../types/index";
import { BasePlugin } from "./base_plugin";
import { UIActions } from "./ui_plugin";

export interface CoreViewPluginConfig {
  readonly getters: Getters;
  readonly stateObserver: StateObserver;
  readonly selection: SelectionStreamProcessor;
  readonly moveClient: (position: ClientPosition) => void;
  readonly uiActions: UIActions;
  readonly custom: ModelConfig["custom"];
  readonly session: Session;
  readonly defaultCurrency?: Partial<Currency>;
  readonly customColors: Color[];
}

export interface CoreViewPluginConstructor {
  new (config: CoreViewPluginConfig): CoreViewPlugin;
  getters: readonly string[];
}

/**
 * Core view plugins handle any data derived from core date (i.e. evaluation).
 * They cannot impact the model data (i.e. cannot dispatch commands).
 */
export class CoreViewPlugin<State = any> extends BasePlugin<State, Command> {
  protected getters: Getters;
  constructor({ getters, stateObserver }: CoreViewPluginConfig) {
    super(stateObserver);
    this.getters = getters;
  }
}
