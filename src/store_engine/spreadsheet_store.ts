import { ModelStore } from "../stores/model_store";
import { Command } from "../types";
import { Get } from "./dependency_container";
import { ReactiveStore } from "./reactive_store";
import { Disposable } from "./store";

export class SpreadsheetStore extends ReactiveStore implements Disposable {
  protected model = this.get(ModelStore);
  protected getters = this.model.getters;

  constructor(get: Get) {
    super(get);
    this.model.on("command-dispatched", this, this.handle);
  }

  protected handle(cmd: Command) {}

  dispose() {
    this.model.off("command-dispatched", this);
  }
}
