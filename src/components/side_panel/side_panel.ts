import { Component, onWillUpdateProps, useState, xml } from "@odoo/owl";
import { BACKGROUND_HEADER_COLOR } from "../../constants";
import { SidePanelContent, sidePanelRegistry } from "../../registries/side_panel_registry";
import { SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";

const TEMPLATE = xml/* xml */ `
  <div class="o-sidePanel" >
    <div class="o-sidePanelHeader">
        <div class="o-sidePanelTitle" t-esc="getTitle()"/>
        <div class="o-sidePanelClose" t-on-click="() => this.props.onCloseSidePanel()">×</div>
    </div>
    <div class="o-sidePanelBody">
      <t t-component="state.panel.Body" t-props="props.panelProps" onCloseSidePanel="props.onCloseSidePanel" t-key="'Body_' + props.component"/>
    </div>
    <div class="o-sidePanelFooter" t-if="state.panel.Footer">
      <t t-component="state.panel.Footer" t-props="props.panelProps" t-key="'Footer_' + props.component"/>
    </div>
  </div>`;

css/* scss */ `
  .o-sidePanel {
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    background-color: white;
    border: 1px solid darkgray;
    .o-sidePanelHeader {
      padding: 6px;
      height: 30px;
      background-color: ${BACKGROUND_HEADER_COLOR};
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid darkgray;
      border-top: 1px solid darkgray;
      font-weight: bold;
      .o-sidePanelTitle {
        font-weight: bold;
        padding: 5px 10px;
        color: dimgrey;
      }
      .o-sidePanelClose {
        font-size: 1.5rem;
        padding: 5px 10px;
        cursor: pointer;
        &:hover {
          background-color: WhiteSmoke;
        }
      }
    }
    .o-sidePanelBody {
      overflow: auto;
      width: 100%;
      height: 100%;

      .o-section {
        padding: 16px;

        .o-section-title {
          font-weight: bold;
          color: dimgrey;
          margin-bottom: 5px;
        }
      }
    }

    .o-sidepanel-error {
      color: red;
      margin-top: 10px;
    }

    .o-sidePanelButtons {
      padding: 16px;
      text-align: right;
      .o-sidePanelButton {
        border: 1px solid lightgrey;
        padding: 0px 20px 0px 20px;
        border-radius: 4px;
        font-weight: 500;
        font-size: 14px;
        height: 30px;
        line-height: 16px;
        background: white;
        margin-right: 8px;
        &:hover:enabled {
          background-color: rgba(0, 0, 0, 0.08);
        }
      }
      .o-sidePanelButton:enabled {
        cursor: pointer;
      }
      .o-sidePanelButton:last-child {
        margin-right: 0px;
      }
    }
    .o-input {
      color: #666666;
      border-radius: 4px;
      min-width: 0px;
      padding: 4px 6px;
      box-sizing: border-box;
      line-height: 1;
      width: 100%;
      .o-type-selector {
        background-position: right 5px top 11px;
      }
    }
    input.o-required {
      border-color: #4c4c4c;
    }
    input.o-invalid {
      border-color: red;
    }
    select.o-input {
      background-color: white;
      text-align: left;
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
  static template = TEMPLATE;

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
