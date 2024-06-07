import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv, UID } from "../../../..";
import { pivotSidePanelRegistry } from "../../../../helpers/pivot/pivot_side_panel_registry";
import { Section } from "../../components/section/section";
import { PivotLayoutConfigurator } from "../pivot_layout_configurator/pivot_layout_configurator";

interface Props {
  pivotId: UID;
  onCloseSidePanel: () => void;
}

export class PivotSidePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotSidePanel";
  static props = {
    pivotId: String,
    onCloseSidePanel: Function,
  };
  static components = {
    PivotLayoutConfigurator,
    Section,
  };

  get sidePanelEditor() {
    const pivot = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    if (!pivot) {
      throw new Error("pivotId does not correspond to a pivot.");
    }
    return pivotSidePanelRegistry.get(pivot.type).editor;
  }
}
