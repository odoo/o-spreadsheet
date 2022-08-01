import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { ComponentsImportance } from "../../../constants";
import { SidePanelContent, sidePanelRegistry } from "../../../registries/side_panel_registry";
import { SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";

css/* scss */ `
  .o-sidePanel {
    user-select: none;
    .o-with-color > span,
    .o-with-color-picker > span {
      border-bottom: 4px solid;
    }
    overflow-x: hidden;
    .o-dropdown {
      .o-dropdown-content {
        top: calc(100% + 5px);
        z-index: ${ComponentsImportance.Dropdown};
        .o-dropdown-item:hover {
          background-color: rgba(0, 0, 0, 0.08);
        }
        .o-dropdown-line {
          .o-line-item {
            &:hover {
              background-color: rgba(0, 0, 0, 0.08);
            }
          }
        }
      }
    }
    .o-tools {
      .o-tool.active,
      .o-tool:not(.o-disabled):hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
  }
`;

interface Props {
  component: string;
  panelProps: any;
  onCloseSidePanel: () => void;
}

interface State {
  panel: SidePanelContent;
}

export class SidePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanel";
  state!: State;

  setup() {
    this.state = useState({
      panel: sidePanelRegistry.get(this.props.component),
    });
    onWillUpdateProps(
      (nextProps: Props) => (this.state.panel = sidePanelRegistry.get(nextProps.component))
    );
  }

  getTitle() {
    return typeof this.state.panel.title === "function"
      ? this.state.panel.title(this.env)
      : this.state.panel.title;
  }
}
