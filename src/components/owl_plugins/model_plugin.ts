import { config, onWillDestroy, Plugin, plugin, signal, types } from "@odoo/owl";
import { Model } from "../../model";

export class ModelPlugin extends Plugin {
  private _model: Model = config("model", types.instanceOf(Model));
  public model = () => {
    this.version();
    return this._model;
  };
  private version = signal(0);

  setup() {
    this._model.on("update", this, () => {
      this.version.set(this.version() + 1);
    });
    onWillDestroy(() => {
      this._model.off("update", this);
    });
  }
}

export function useModel() {
  return plugin(ModelPlugin).model;
}
