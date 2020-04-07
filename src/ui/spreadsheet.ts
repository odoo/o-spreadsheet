import * as owl from "@odoo/owl";

import { Grid } from "./grid";
import { Model } from "../model";
import { TopBar } from "./top_bar";
import { BottomBar } from "./bottom_bar";
import { TOPBAR_HEIGHT, BOTTOMBAR_HEIGHT } from "../constants";
import { SidePanel } from "./side_panel/side_panel";
import { Registry } from "../registry";
import { ConditionalFormattingPanel } from "./side_panel/conditional_formatting";

const { Component, useState } = owl;
const { useRef, useExternalListener } = owl.hooks;
const { xml, css } = owl.tags;
const { useSubEnv } = owl.hooks;

//------------------------------------------------------------------------------
// Side Panel Registry
//------------------------------------------------------------------------------
interface SidePanelContent {
  title: string;
  Body: any;
  Footer?: any;
}

export const sidePanelRegistry = new Registry<SidePanelContent>();

sidePanelRegistry.add("ConditionalFormatting", {
  title: "Conditional Formatting",
  Body: ConditionalFormattingPanel
});

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet">
    <TopBar model="model" t-on-click="focusGrid"/>
    <Grid model="model" t-ref="grid"/>
    <BottomBar model="model" />
    <SidePanel t-if="sidePanel.isOpen"
           t-on-close-side-panel="sidePanel.isOpen = false"
           model="model"
           title="sidePanel.title"
           Body="sidePanel.Body"
           Footer="sidePanel.Footer"/>
  </div>`;

const CSS = css/* scss */ `
  .o-spreadsheet {
    display: grid;
    grid-template-rows: ${TOPBAR_HEIGHT}px auto ${BOTTOMBAR_HEIGHT}px;
    * {
      font-family: Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
    }
    &,
    *,
    *:before,
    *:after {
      box-sizing: content-box;
    }
  }

  .o-icon {
    width: 18px;
    height: 18px;
    opacity: 0.6;
  }
`;

interface Props {
  data?: any;
}

export interface SpreadsheetEnv {
  openSidePanel: (panel: string) => void;
}

export class Spreadsheet extends Component<Props> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { TopBar, Grid, BottomBar, SidePanel };

  model = new Model(this.props.data);
  grid = useRef("grid");

  sidePanel = useState({ isOpen: false } as {
    isOpen: boolean;
    title?: string;
    Body?: any;
    Footer?: any;
  });
  constructor() {
    super(...arguments);
    const spreadsheetEnv: SpreadsheetEnv = {
      openSidePanel: (panel: string) => this.openSidePanel(panel)
    };
    useSubEnv({ spreadsheet: spreadsheetEnv });
    useExternalListener(window as any, "resize", this.render);
  }

  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
  }

  openSidePanel(panel: string) {
    const panelComponent = sidePanelRegistry.get(panel);
    this.sidePanel.title = panelComponent.title;
    this.sidePanel.Body = panelComponent.Body;
    this.sidePanel.Footer = panelComponent.Footer;
    this.sidePanel.isOpen = true;
  }
  focusGrid() {
    (<any>this.grid.comp).focus();
  }
}
