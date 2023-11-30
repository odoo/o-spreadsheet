import { Model } from "../model";
import { DisposableStore, Get } from "../store_engine";
import { Command } from "../types";
import { ModelStore } from "./model_store";

export class SpreadsheetStore extends DisposableStore {
  // cast the model store as Model to allow model.dispatch to return the DispatchResult
  protected model = this.get(ModelStore) as Model;
  protected getters = this.model.getters;

  constructor(get: Get) {
    super(get);
    this.model.on("command-dispatched", this, this.handle);
    this.model.on("command-finalized", this, this.finalize);
    this.onDispose(() => {
      this.model.off("command-dispatched", this);
      this.model.off("command-finalized", this);
    });
  }

  protected handle(cmd: Command) {}
  protected finalize() {}
}
