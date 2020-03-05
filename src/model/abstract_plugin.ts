import { GridHistory } from "./history";
import {
  GridCommand,
  PartialGridDataWithVersion,
  ViewPort,
  CoreState,
  CoreGridState,
  GridData
} from "./types";

// ----------------------------------------------------------------------------
// Base Plugin class
// ----------------------------------------------------------------------------

export abstract class AbstractPlugin {
  history: GridHistory;

  constructor(history: GridHistory, data: Partial<GridData>) {
    this.history = history;
  }

  setState(path: (string | number)[], value: any) {
    this.history.setState(this, path, value);
  }

  dispatch(command: GridCommand): GridCommand[] | void {}

  /**
   * Returns the necessary state to render the spreadsheet UI, excluding the
   * grid content
   */
  getState(state: CoreState): any {
    return state;
  }

  /**
   * Returns the necessary state to render the
   */
  getGridState(state: CoreGridState, viewPort: ViewPort): any {
    return state;
  }
}
