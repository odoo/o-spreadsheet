import { Component, useState } from "@odoo/owl";
import { css } from "../../../helpers";
import { Collapse } from "../collapse/collapse";

css/* scss */ `
  .o_side_panel_collapsible_title {
    font-size: 16px;
    cursor: pointer;
    padding: 6px 0px 6px 6px !important;

    .collapsor-arrow {
      transform: rotate(-90deg);
      display: inline-block;
      transform-origin: 8px 11px;
      transition: transform 0.2s ease-in-out;

      .o-icon {
        width: 16px;
        height: 22px;
      }
    }
    .collapsor:not(.collapsed) .collapsor-arrow {
      transform: rotate(0);
    }

    .collapsor {
      width: 100%;
      transition-delay: 0.35s;
      transition-property: all;
    }
  }
`;

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
