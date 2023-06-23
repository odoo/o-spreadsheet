import { Command } from "../types";
import { ModelStore } from "./model_store";
import { Store } from "./store";

export class SpreadsheetStore extends Store {
  protected model = this.get(ModelStore);

  constructor(get) {
    super(get);
    this.model.on("command-dispatched", this, this.handle);
  }

  protected handle(cmd: Command) {}
}
