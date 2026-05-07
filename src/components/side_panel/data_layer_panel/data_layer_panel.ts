import { Component } from "@odoo/owl";
import { getCanonicalSymbolName } from "../../../helpers/misc";
import { zoneToXc } from "../../../helpers/zones";
import { DataLayerDefinition } from "../../../types/data_layer";
import { UID } from "../../../types/misc";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { SelectionInput } from "../../selection_input/selection_input";
import { Section } from "../components/section/section";

interface Props {
  onCloseSidePanel: () => void;
  figureId: UID;
}

export class DataLayerPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataLayerPanel";
  static props = { onCloseSidePanel: Function, figureId: String };
  static components = { Section, SelectionInput };

  private pendingRange: string | undefined;

  get definition(): DataLayerDefinition {
    return this.env.model.getters.getDataLayer(this.props.figureId);
  }

  get rangeString(): string {
    const def = this.definition;
    const sheetName = this.env.model.getters.getSheetName(def.sheetId);
    return `${getCanonicalSymbolName(sheetName)}!${def.rangeXc}`;
  }

  onRangeChanged(ranges: string[]) {
    this.pendingRange = ranges[0];
  }

  onRangeConfirmed() {
    if (!this.pendingRange) {
      return;
    }
    const def = this.definition;
    const range = this.env.model.getters.getRangeFromSheetXC(def.sheetId, this.pendingRange);
    const sheetId = this.env.model.getters.getFigureSheetId(this.props.figureId);
    if (!sheetId) {
      return;
    }
    this.env.model.dispatch("UPDATE_DATA_LAYER", {
      dataLayerId: this.props.figureId,
      sheetId,
      definition: { rangeXc: zoneToXc(range.zone), sheetId: range.sheetId },
    });
    this.pendingRange = undefined;
  }
}
