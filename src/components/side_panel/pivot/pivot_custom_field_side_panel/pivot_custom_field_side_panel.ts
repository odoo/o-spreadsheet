import { Component } from "@odoo/owl";
import { pivotSidePanelRegistry } from "../../../../helpers/pivot/pivot_side_panel_registry";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import { css } from "../../../helpers";
import { Section } from "../../components/section/section";

css/* scss */ ``;

interface Props {
  pivotId: UID;
  onCloseSidePanel: () => void;
}

export class PivotCustomFieldPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotCustomFieldPanel";
  static props = {
    pivotId: String,
    onCloseSidePanel: Function,
  };
  static components = { Section };

  setup(): void {
    const pivot = this.env.model.getters.getPivot(this.props.pivotId);
    console.log(pivot.definition);
  }

  onValuesChanged(values: string[]) {
    console.log("Values changed:", values);
  }

  get pivot() {
    return this.env.model.getters.getPivot(this.props.pivotId);
  }

  get GroupEditorComponent() {
    return pivotSidePanelRegistry.get(this.pivot.type).fieldGroupEditor;
  }

  get parentField() {
    return "Opportunity"; // ADRM TODO
  }
}
