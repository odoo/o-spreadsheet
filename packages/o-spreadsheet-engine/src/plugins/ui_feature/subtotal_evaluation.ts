import { CellPosition } from "../..";
import { PositionMap } from "../../helpers/cells/position_map";
import {
  evaluationListenerRegistry,
  EvaluationMessage,
} from "../../helpers/pivot/evaluation_listener_registry";
import { Command, invalidSubtotalFormulasCommands } from "../../types/commands";
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

export class SubtotalEvaluationPlugin extends UIPlugin {
  static getters = ["isSubtotalCell"] as const;

  private subtotalPositions = new PositionMap<boolean>();

  constructor(config: UIPluginConfig) {
    super(config);
    evaluationListenerRegistry.replace("SubtotalEvaluationPlugin", {
      handleEvaluationMessage: this.handleEvaluationMessage.bind(this),
    });
  }

  handle(cmd: Command) {
    if (invalidSubtotalFormulasCommands.has(cmd.type)) {
      this.dispatch("EVALUATE_CELLS", {
        cellIds: this.getSubtotalCellIds(),
      });
    }
  }

  handleEvaluationMessage(message: EvaluationMessage) {
    if (message.type === "invalidateAllCells") {
      this.subtotalPositions = new PositionMap<boolean>();
    } else if (message.type === "invalidateCell") {
      this.subtotalPositions.delete(message.position);
    } else if (message.type === "addSubTotalToPosition") {
      this.subtotalPositions.set(message.position, true);
    }
  }

  isSubtotalCell(position: CellPosition): boolean {
    return this.subtotalPositions.has(position);
  }

  private getSubtotalCellIds(): string[] {
    const cellIds: string[] = [];
    for (const position of this.subtotalPositions.keys()) {
      const cellId = this.getters.getCell(position)?.id;
      if (cellId) {
        cellIds.push(cellId);
      }
    }
    return cellIds;
  }
}
