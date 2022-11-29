import * as owl from "@odoo/owl";
import { SidePanelContent, sidePanelRegistry } from "../../registries/side_panel_registry";
import { SpreadsheetEnv } from "../../types";

const Component = owl.Component;
const { xml, css } = owl.tags;
const { useState } = owl.hooks;

const TEMPLATE = xml/* xml */ `
  <div class="o-sidePanel" >
    <div class="o-sidePanelHeader">
        <div class="o-sidePanelTitle" t-esc="getTitle()"/>
        <div class="o-sidePanelClose" t-on-click="trigger('close-side-panel')">×</div>
    </div>
    <div class="o-sidePanelBody">
      <t t-component="state.panel.Body" t-props="props.panelProps" t-key="'Body_' + props.component"/>
    </div>
    <div class="o-sidePanelFooter" t-if="state.panel.Footer">
      <t t-component="state.panel.Footer" t-props="props.panelProps" t-key="'Footer_' + props.component"/>
    </div>
  </div>`;

const CSS = css/* scss */ `
  .o-sidePanel {
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    background-color: white;
    border: 1px solid darkgray;
    .o-sidePanelHeader {
      padding: 6px;
      height: 30px;
      background-color: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid darkgray;
      font-weight: bold;
      .o-sidePanelTitle {
        font-weight: bold;
        padding: 5px 10px;
        font-size: 1.2rem;
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
    }

    .o-sidePanelButtons {
      padding: 5px 16px;
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
        cursor: pointer;
        margin-right: 8px;
        &:hover {
          background-color: rgba(0, 0, 0, 0.08);
        }
      }
      .o-sidePanelButton:last-child {
        margin-right: 0px;
      }
    }
    .o-input {
      border-radius: 4px;
      border: 1px solid lightgrey;
      padding: 4px 6px;
      width: 96%;
      .o-type-selector {
        background-position: right 5px top 11px;
      }
    }
    select.o-input {
      background-color: white;
      text-align: left;
    }

    .o-section {
      padding: 16px;
      .o-section-title {
        font-weight: bold;
        margin-bottom: 5px;
      }
    }
  }
`;

interface Props {
  component: string;
  panelProps: any;
}

export class SidePanel extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;

  state: { panel: SidePanelContent } = useState({
    panel: sidePanelRegistry.get(this.props.component),
  });

  async willUpdateProps(nextProps: Props) {
    this.state.panel = sidePanelRegistry.get(nextProps.component);
  }

  getTitle() {
    return typeof this.state.panel.title === "function"
      ? this.state.panel.title(this.env)
      : this.state.panel.title;
  }
}
