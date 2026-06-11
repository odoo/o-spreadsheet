import { onWillDestroy, plugin, Plugin } from "@odoo/owl";
import { Command } from "../../types/commands";
import { ModelPlugin } from "./model_plugin";

export class SpreadsheetOwlPlugin extends Plugin {
  protected modelPlugin = plugin(ModelPlugin);

  constructor(pluginManager: any) {
    super(pluginManager);
    this.model.on("command-dispatched", this, this.handle);
    this.model.on("command-finalized", this, this.finalize);

    onWillDestroy(() => {
      this.model.off("command-dispatched", this);
      this.model.off("command-finalized", this);
    });
  }

  protected handle(cmd: Command) {}
  protected finalize() {}

  get model() {
    return this.modelPlugin.model();
  }

  get getters() {
    return this.model.getters;
  }
}
