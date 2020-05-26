import * as owl from "@odoo/owl";
import { sidePanelRegistry, SidePanelContent } from "./side_panel_registry";
import { SpreadsheetEnv } from "../../types";
import { TOPBAR_HEIGHT, SCROLLBAR_WIDTH, BOTTOMBAR_HEIGHT } from "../../constants";

const { Component } = owl;
const { xml, css } = owl.tags;
const { useState } = owl.hooks;

const TEMPLATE = xml/* xml */ `
  <div class="o-sidePanel" >
    <div class="o-sidePanelHeader">
        <div class="o-sidePanelTitle" t-esc="getTitle()"/>
        <div class="o-sidePanelClose" t-on-click="trigger('close-side-panel')">x</div>
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
    position: absolute;
    top: ${TOPBAR_HEIGHT}px;
    right: ${SCROLLBAR_WIDTH}px;
    bottom: ${BOTTOMBAR_HEIGHT}px;
    overflow-x: hidden;
    background-color: white;
    min-width: 200px;
    max-width: 350px;
    border: 1px solid darkgray;
    .o-sidePanelHeader {
      padding: 6px;
      height: 41px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid darkgray;
      font-weight: bold;
      .o-sidePanelTitle {
        padding: 10px;
        font-size: 1.2rem;
      }
      .o-sidePanelClose {
        padding: 11px 15px;
        cursor: pointer;
      }
    }
    .o-sidePanelBody {
      padding: 6px;
    }
    .o-sidePanelFooter {
      padding: 6px;
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
    return typeof this.state.panel.title === "string"
      ? this.state.panel.title
      : this.state.panel.title(this.env);
  }
}
