import { colors } from "../../helpers/index";
import { Mode } from "../../model";
import { UID, LAYERS, GridRenderingContext } from "../../types";
import { UIPlugin } from "../ui_plugin";

function randomChoice(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class SelectionMultiuserPlugin extends UIPlugin {
  static layers = [LAYERS.Selection];
  static modes: Mode[] = ["normal", "readonly"];
  private colors: Record<UID, string> = {};

  drawGrid(renderingContext: GridRenderingContext) {
    const { viewport, ctx, thinLineWidth } = renderingContext;
    const activeSheetId = this.getters.getActiveSheetId();
    for (const client of this.getters.getConnectedClients()) {
      if (
        client.id === this.getters.getUserId() ||
        !client.position ||
        client.position.sheetId !== activeSheetId
      ) {
        continue;
      }
      const { row, col } = client.position;
      const zone = this.getters.expandZone(activeSheetId, {
        top: row,
        bottom: row,
        left: col,
        right: col,
      });
      const [x, y, width, height] = this.getters.getRect(zone, viewport);
      if (!this.colors[client.id]) {
        this.colors[client.id] = randomChoice(colors);
      }
      const color = this.colors[client.id];
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
        ctx.fillText(client.name, x + 1, y - 10);
      }
    }
  }
}
