import { Session } from "../collaborative/session";
import { StateObserver } from "../state_observer";
import { Command } from "../types/commands";
import { Currency } from "../types/currency";
import { Getters } from "../types/getters";
import { Color } from "../types/misc";
import { ModelConfig } from "../types/model";
import { BasePlugin } from "./base_plugin";

export interface CoreViewPluginConfig {
  readonly getters: Getters;
  readonly stateObserver: StateObserver;
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
export class CoreViewPlugin<State = any> extends BasePlugin<State, Command> {
  protected getters: Getters;
  constructor({ getters, stateObserver }: CoreViewPluginConfig) {
    super(stateObserver);
    this.getters = getters;
  }
}
