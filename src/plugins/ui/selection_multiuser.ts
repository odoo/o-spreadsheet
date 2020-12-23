import { toCartesian, toXC, colors } from "../../helpers";
import { Mode } from "../../model";
import { UID, LAYERS, Command, GridRenderingContext } from "../../types";
import { UIPlugin } from "../ui_plugin";

interface Selection {
  displayName: string;
  col: number;
  row: number;
  sheetId: UID;
}

function randomChoice(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class SelectionMultiuserPlugin extends UIPlugin {
  static layers = [LAYERS.Selection];
  static modes: Mode[] = ["normal", "readonly"];
  readonly selections: Record<UID, Selection> = {};
  private colors: Record<UID, string> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SELECT_CELL_MULTIUSER":
        let [col, row] = this.getters.getPosition();
        [col, row] = toCartesian(this.getters.getMainCell(cmd.sheetId, toXC(col, row)));
        this.selections[cmd.clientId] = {
          col: cmd.col,
          row: cmd.row,
          sheetId: cmd.sheetId,
          displayName: cmd.clientName,
        };
        break;
    }
  }

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;
    const activeSheetId = this.getters.getActiveSheetId();
    for (let [id, user] of Object.entries(this.selections)) {
      if (id === this.getters.getUserId() || user.sheetId !== activeSheetId) {
        continue;
      }
      const zone = this.getters.expandZone(activeSheetId, {
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
