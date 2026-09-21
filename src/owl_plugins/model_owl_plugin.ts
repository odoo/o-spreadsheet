import { onWillDestroy, Plugin, signal, useConfig } from "@odoo/owl";
import { types } from "../components/props_validation";

export class ModelPlugin extends Plugin {
  _model = signal(useConfig("model", types.Model()));

  setup() {
    this._model().on("update", this, () => {
      signal.trigger(this._model);
    });
    onWillDestroy(() => {
      this._model().off("update", this);
    });
  }

  get model() {
    return this._model;
  }
}
