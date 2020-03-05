import { AbstractPlugin } from "../abstract_plugin";
import { MergeState, StyleState } from "../types";

// ----------------------------------------------------------------------------
// StylePlugin
// ----------------------------------------------------------------------------
export class StylePlugin extends AbstractPlugin {
  getState(state: MergeState): StyleState {
    return {
      ...state,
      fillColor: "white",
      textColor: "black"
    };
  }
}
