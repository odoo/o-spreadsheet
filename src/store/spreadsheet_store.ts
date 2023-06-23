import { Command } from "../types";
import { DisposableStore } from "./dependency_container";
import { ModelStore } from "./model_store";
import { ReactiveStore } from "./store";

export class SpreadsheetStore extends ReactiveStore {
  protected model = this.get(ModelStore);
  protected getters = this.model.getters;

  constructor(get) {
    super(get);
    this.model.on("command-dispatched", this, this.handle);
  }

  protected handle(cmd: Command) {}
}

export class LocalSpreadsheetStore extends SpreadsheetStore implements DisposableStore {
  dispose() {
    this.model.off("command-dispatched", this);
  }
}
