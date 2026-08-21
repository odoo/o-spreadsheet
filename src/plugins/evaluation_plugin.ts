import { Session } from "../collaborative/session";
import { StateObserver } from "../state_observer";
import { Command } from "../types/commands";
import { Currency } from "../types/currency";
import { Getters } from "../types/getters";
import { Color } from "../types/misc";
import { ModelConfig } from "../types/model";
import { BasePlugin } from "./base_plugin";

export interface EvaluationPluginConfig {
  readonly getters: Getters;
  readonly stateObserver: StateObserver;
  readonly custom: ModelConfig["custom"];
  readonly session: Session;
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
 * They cannot impact the model data (i.e. cannot dispatch commands).
 */
export class EvaluationPlugin<State = any> extends BasePlugin<State, Command> {
  protected getters: Getters;
  constructor({ getters, stateObserver }: EvaluationPluginConfig) {
    super(stateObserver);
    this.getters = getters;
  }
}
