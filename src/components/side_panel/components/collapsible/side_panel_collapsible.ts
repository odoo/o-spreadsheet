import { Component, proxy, useProps } from "@odoo/owl";
import { types } from "../../../props_validation";
import { Collapse } from "../collapse/collapse";

export class SidePanelCollapsible extends Component {
  static template = "o-spreadsheet-SidePanelCollapsible";
  static components = { Collapse };

  protected props = useProps({
    title: types.string().optional(),
    isInitiallyCollapsed: types.boolean().optional(),
    class: types.string().optional(),
  });

  private state: { isCollapsed: boolean } = proxy({
    isCollapsed: !!this.props.isInitiallyCollapsed,
  });

  toggle() {
    this.state.isCollapsed = !this.state.isCollapsed;
  }
}
