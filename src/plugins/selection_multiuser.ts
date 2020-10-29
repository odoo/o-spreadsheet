import { BasePlugin } from "../base_plugin";
import { colors } from "../helpers/color";
import { toCartesian, toXC } from "../helpers/coordinates";
import { uuidv4 } from "../helpers/uuid";
import { Mode } from "../model";
import { Command, GridRenderingContext, LAYERS } from "../types";
import { UID } from "../types/misc";

interface Selection {
  displayName: string;
  col: number;
  row: number;
  sheetId: UID;
}

interface SelectionMultiuserState {
  readonly selections: Record<UID, Selection>;
}

function randomChoice(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDisplayName(): string {
  return randomChoice([
    "Florent",
    "Florent",
    "Lucas",
    "Vincent",
    "Rémi",
    "Alexis",
    "Nathan",
    "Pierre",
  ]);
}

export class SelectionMultiuserPlugin
  extends BasePlugin<SelectionMultiuserState>
  implements SelectionMultiuserState {
  static layers = [LAYERS.Selection];
  static modes: Mode[] = ["normal", "readonly"];
  private userId = uuidv4();
  private userName = randomDisplayName();
  readonly selections: Record<UID, Selection> = {
    [this.userId]: {
      col: 0,
      row: 0,
      sheetId: this.getters.getActiveSheetId(),
      displayName: this.userName,
    },
  };
  private colors: Record<UID, string> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      // TODO make it work at start
      // case "START":
      case "SELECT_CELL":
        let [col, row] = this.getters.getPosition();
        [col, row] = toCartesian(this.getters.getMainCell(toXC(col, row)));
        this.history.doNotHistorize(() => {
          this.history.update("selections", this.userId, {
            col: col,
            row: row,
            sheetId: this.getters.getActiveSheetId(),
            displayName: this.userName,
          });
        });
        break;
    }
  }

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;

    for (let [id, user] of Object.entries(this.selections)) {
      if (id === this.userId || user.sheetId !== this.getters.getActiveSheetId()) {
        continue;
      }
      const zone = this.getters.expandZone({
        top: user.row,
        bottom: user.row,
        left: user.col,
        right: user.col,
      });
      const [x, y, width, height] = this.getters.getRect(zone, viewport);
      if (!this.colors[id]) {
        this.colors[id] = randomChoice(colors);
      }
      const color = this.colors[id];
      ctx.fillStyle = color + "10";
      ctx.lineWidth = 3 * thinLineWidth;
      ctx.strokeStyle = color;
      if (width > 0 && height > 0) {
        ctx.globalCompositeOperation = "multiply";
        ctx.fillRect(x, y, width, height);
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeRect(x, y, width, height);
        ctx.fillStyle = color;
        ctx.fillText(user.displayName, x + 1, y - 10);
      }
    }
  }
}
