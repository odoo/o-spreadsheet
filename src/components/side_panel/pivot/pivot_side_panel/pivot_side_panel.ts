import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv, UID } from "../../../..";
import { pivotSidePanelRegistry } from "../../../../helpers/pivot/pivot_side_panel_registry";
import { Section } from "../../components/section/section";
import { PivotDimensions } from "../pivot_dimensions/pivot_dimensions";
import { PivotPreview } from "../pivot_preview/pivot_preview";

interface Props {
  pivotId?: UID;
  onCloseSidePanel: () => void;
}

export class PivotSidePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotSidePanel";
  static props = {
    pivotId: { type: String, optional: true },
    onCloseSidePanel: Function,
  };
  static components = {
    PivotDimensions,
    Section,
    PivotPreview,
  };

  get sidePanelEditor() {
    if (!this.props.pivotId) {
      throw new Error("pivotId is required to call this function.");
    }
    const pivot = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    if (!pivot) {
      throw new Error("pivotId does not correspond to a pivot.");
    }
    return pivotSidePanelRegistry.get(pivot.type).editor;
  }
}
