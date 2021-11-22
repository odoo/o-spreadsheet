import { CoreCommand, Position } from "../../types";
import { CorePlugin } from "../core_plugin";

interface FreezeState {
  readonly freezedRow: number | undefined;
  readonly freezedCol: number | undefined;
}

export class FreezePlugin extends CorePlugin<FreezeState> implements FreezeState {
  static getters = ["getFreezed"] as const;
  // TODO by sheet
  readonly freezedCol = undefined;
  readonly freezedRow = undefined;

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "FREEZE":
        this.history.update("freezedCol", cmd.col);
        this.history.update("freezedRow", cmd.row);
        break;
      // case "UNFREEZE" ?
    }
  }

  getFreezed(): Partial<Position> {
    return {
      col: this.freezedCol,
      row: this.freezedRow,
    };
  }
}
