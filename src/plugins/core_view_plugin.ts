import { Command, Getters, LAYERS } from "../types/index";
import { BasePlugin } from "./base_plugin";
import { UIPluginConfig } from "./ui_plugin";

export type CoreViewPluginConfig = Omit<UIPluginConfig, "dispatch">;

export interface CoreViewPluginConstructor {
  new (config: CoreViewPluginConfig): CoreViewPlugin;
  getters: readonly string[];
}

/**
 * Core view plugins handle any data derived from core date (i.e. evaluation).
 * They cannot impact the model data (i.e. cannot dispatch commands).
 */
export class CoreViewPlugin<State = any> extends BasePlugin<State, Command> {
  static layers: LAYERS[] = [];

  protected getters: Getters;
  constructor({ getters, stateObserver }: CoreViewPluginConfig) {
    super(stateObserver);
    this.getters = getters;
  }
}
