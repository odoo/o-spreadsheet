import { onWillDestroy, Plugin, untrack, usePlugin } from "@odoo/owl";
import { Command } from "../types/commands";
import { ModelPlugin } from "./model_owl_plugin";

export abstract class OwlPluginWithModel extends Plugin {
  modelPlugin = usePlugin(ModelPlugin);

  setup() {
    this.model().on("command-dispatched", this, (cmd: Command) => untrack(() => this.handle(cmd)));
    this.model().on("command-finalized", this, () => untrack(() => this.finalize()));

    onWillDestroy(() => {
      this.model().off("command-dispatched", this);
      this.model().off("command-finalized", this);
    });
  }

  protected handle(cmd: Command) {}
  protected finalize() {}

  get model() {
    return this.modelPlugin.model;
  }
}
