import { Model } from "../model";
import { Command } from "../types";
import { Disposable, Get, ReactiveStore, createValueStore } from "./store";

export const ModelStore = createValueStore(() => new Model());

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
