import { colors } from "../../helpers/index";
import { Mode } from "../../model";
import { UID, LAYERS, Command, GridRenderingContext } from "../../types";
import { ClientPosition } from "../../types/multi_users";
import { UIPlugin } from "../ui_plugin";

function randomChoice(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class SelectionMultiuserPlugin extends UIPlugin {
  static layers = [LAYERS.Selection];
  static getters = ["getConnectedClients"];
  static modes: Mode[] = ["normal", "readonly"];
  readonly positions: Record<UID, ClientPosition & { displayName: string }> = {};
  private colors: Record<UID, string> = {};

  handle(cmd: Command) {
    switch (cmd.type) {
      case "CLIENT_JOINED": {
        const { position, client } = cmd;
        this.positions[client.id] = {
          col: position.col,
          row: position.row,
          sheetId: position.sheetId,
          displayName: client.name,
        };
        break;
      }
      case "CLIENT_MOVED":
        const { position } = cmd;
        this.positions[cmd.client.id] = {
          col: position.col,
          row: position.row,
          sheetId: position.sheetId,
          displayName: cmd.client.name,
        };
        break;
      case "CLIENT_LEFT":
        debugger;
        delete this.positions[cmd.clientId];
        break;
    }
  }

  getConnectedClients(): string[] {
    return Array.from(new Set<string>(Object.values(this.positions).map((pos) => pos.displayName)));
  }

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;
    const activeSheetId = this.getters.getActiveSheetId();
    for (let [id, user] of Object.entries(this.positions)) {
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
        ctx.textAlign = "left";
        ctx.fillText(user.displayName, x + 1, y - 10);
      }
    }
  }
}
