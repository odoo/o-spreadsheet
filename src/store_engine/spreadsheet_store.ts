import { ModelStore } from "../stores/model_store";
import { Command } from "../types";
import { ReactiveStore } from "./reactive_store";
import { DisposableStore } from "./store";

export class SpreadsheetStore extends ReactiveStore implements DisposableStore {
  protected model = this.get(ModelStore);
  protected getters = this.model.getters;

  constructor(get) {
    super(get);
    this.model.on("command-dispatched", this, this.handle);
  }

  protected handle(cmd: Command) {}

  dispose() {
    this.model.off("command-dispatched", this);
  }
}
