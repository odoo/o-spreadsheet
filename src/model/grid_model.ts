import * as owl from "@odoo/owl";
import { AbstractPlugin } from "./abstract_plugin";
import { Core } from "./core/core";
import { GridHistory } from "./history";
import { MergePlugin } from "./plugins/merge";
import { StylePlugin } from "./plugins/style";
import {
  GridCommand,
  GridState,
  PartialGridDataWithVersion,
  SpreadSheetState,
  ViewPort
} from "./types";

/**
 * This is the current state version number. It should be incremented each time
 * a breaking change is made in the way the state is handled, and an upgrade
 * function should be defined
 */
export const CURRENT_VERSION = 1;

// ----------------------------------------------------------------------------
// GridModel
// ----------------------------------------------------------------------------

export class GridModel extends owl.core.EventBus {
  static plugins = [MergePlugin, StylePlugin];
  core: Core;
  plugins: AbstractPlugin[] = [];
  history: GridHistory = new GridHistory();

  state: SpreadSheetState;
  selection: any;

  constructor(data: PartialGridDataWithVersion = { version: CURRENT_VERSION }) {
    super();

    // todo: remove this:
    (window as any).gridModel = this;

    this.core = new Core(this.history, data);
    for (let Plugin of GridModel.plugins) {
      const plugin = new Plugin(this.history, data);
      this.plugins.push(plugin);
    }
    this.state = this.getState();
    this.core.evaluateFormulas();
  }

  undo() {
    this.history.undo();
  }

  redo() {
    this.history.redo();
  }

  dispatch(command: GridCommand) {
    this.history.startTracking();
    let list = [command];
    const listeners = [this.core, ...this.plugins];
    while (list.length) {
      const current = list.shift()!;

      for (let p of listeners) {
        const result = p.dispatch(current);
        if (result) {
          list.push(...result);
        }
      }
    }
    this.history.stopTracking();
    this.core.evaluateFormulas();

    this.state = this.getState();
    // this.selection = this.core.selection;
  }

  getState(): SpreadSheetState {
    let state = this.core.getState();
    for (let p of this.plugins) {
      state = p.getState(state);
    }
    return state as SpreadSheetState;
  }

  getGridState(viewPort: ViewPort): GridState {
    let state = this.core.getGridState(null, viewPort);
    for (let p of this.plugins) {
      state = p.getGridState(state, viewPort);
    }
    return state as GridState;
  }
}
