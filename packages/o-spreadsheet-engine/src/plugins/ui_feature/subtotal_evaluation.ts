import { Command, invalidSubtotalFormulasCommands } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class SubtotalEvaluationPlugin extends UIPlugin {
  handle(cmd: Command) {
    if (invalidSubtotalFormulasCommands.has(cmd.type)) {
      this.dispatch("EVALUATE_CELLS", {
        cellIds: this.getSubtotalCellIds(),
      });
    }
  }

  private getSubtotalCellIds(): string[] {
    const cellIds: string[] = [];
    const metaData = this.getters.getEvaluatedCellMetaDataMap();
    for (const position of metaData.keys()) {
      const data = metaData.get(position);
      if (data?.subtotal) {
        const cellId = this.getters.getCell(position)?.id;
        if (cellId) cellIds.push(cellId);
      }
    }
    return cellIds;
  }
}
