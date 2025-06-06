import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import { Section } from "../../components/section/section";

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
  static components = {
    Section,
  };
}
