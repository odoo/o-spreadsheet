import { Model } from "../model";
import { Command } from "../types";
import { Disposable, Get, ReactiveStore, createMetaStore } from "./store";

export const ModelStore = createMetaStore<Model>("Model");

export class SpreadsheetStore extends ReactiveStore implements Disposable {
  protected model = this.get(ModelStore);
  protected getters = this.model.getters;

  constructor(get: Get) {
    super(get);
    this.model.on("command-dispatched", this, this.handle);
    this.model.on("command-finalized", this, this.finalize);
  }

  protected handle(cmd: Command) {}
  protected finalize() {}

  dispose() {
    this.model.off("command-dispatched", this);
    this.model.off("command-finalized", this);
  }
}
