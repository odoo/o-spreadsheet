import { UIPlugin } from "../..";
import { Command, UID } from "../../types";

export class UiFigurePlugin extends UIPlugin {
  static getters = ["isMovingFigure"];

  private figure: { sheetId: UID; id: UID } | undefined = undefined;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "MOVE_FIGURE":
        this.figure = { sheetId: cmd.sheetId, id: cmd.id };
        break;
      case "DELETE_FIGURE":
      case "STOP_MOVE_FIGURE":
        if (this.figure && this.figure.id === cmd.id && this.figure.sheetId === cmd.sheetId) {
          this.figure = undefined;
        }
        break;
    }
  }

  // getters

  isMovingFigure(): boolean {
    return !!this.figure;
  }
}
