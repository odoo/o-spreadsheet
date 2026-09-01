import { Session } from "../collaborative/session";
import { StateObserver } from "../state_observer";
import { EvaluationCommand, EvaluationCommandDispatcher } from "../types/commands";
import { Currency } from "../types/currency";
import { EvaluationGetters } from "../types/getters";
import { Color } from "../types/misc";
import { ModelConfig } from "../types/model";
import { BasePlugin } from "./base_plugin";

export interface EvaluationPluginConfig {
  readonly getters: EvaluationGetters;
  readonly stateObserver: StateObserver;
  readonly custom: ModelConfig["custom"];
  readonly session: Session;
  readonly dispatch: EvaluationCommandDispatcher["dispatch"];
  readonly defaultCurrency?: Partial<Currency>;
  readonly customColors: Color[];
  readonly external: ModelConfig["external"];
}

export interface EvaluationPluginConstructor {
  new (config: EvaluationPluginConfig): EvaluationPlugin;
  getters: readonly string[];
}

/**
 * Evaluation plugins handle any data derived from core data (i.e. evaluation).
 * They cannot impact the model data (i.e. cannot dispatch core commands).
 */
export class EvaluationPlugin<State = any> extends BasePlugin<State, EvaluationCommand> {
  protected getters: EvaluationGetters;
  protected dispatch: EvaluationCommandDispatcher["dispatch"];
  constructor({ getters, stateObserver, dispatch }: EvaluationPluginConfig) {
    super(stateObserver);
    this.getters = getters;
    this.dispatch = dispatch;
  }
}
