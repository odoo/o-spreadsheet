import { Component, useState } from "@odoo/owl";
import { Collapse } from "../collapse/collapse";

export class SidePanelCollapsible extends Component {
  static template = "o-spreadsheet-SidePanelCollapsible";
  static props = {
    slots: Object,
    title: { type: String, optional: true },
    isInitiallyCollapsed: { type: Boolean, optional: true },
    class: { type: String, optional: true },
  };
  static components = { Collapse };

  private state: { isCollapsed: boolean } = useState({
    isCollapsed: this.props.isInitiallyCollapsed,
  });

  toggle() {
    this.state.isCollapsed = !this.state.isCollapsed;
  }
}
