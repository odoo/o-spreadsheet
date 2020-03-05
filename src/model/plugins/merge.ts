import { AbstractPlugin } from "../abstract_plugin";
import { CoreState, MergeState } from "../types";

// ----------------------------------------------------------------------------
// MergePlugin
// ----------------------------------------------------------------------------
export class MergePlugin extends AbstractPlugin {
  // dispatch(command: GridCommand) {
  //     switch (command.type) {
  //         case "ADD_CELL":
  //              ...
  //              break;
  //     }
  // }

  getState(state: CoreState): MergeState {
    return {
      ...state,
      cannotMerge: false,
      inMerge: false
    };
  }
}
