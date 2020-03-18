import * as owl from "@odoo/owl";

import { Grid } from "./grid";
import { GridModel } from "../model/index";
import { PartialWorkbookDataWithVersion } from "../model/import_export";
import { TopBar } from "./top_bar";
import { BottomBar } from "./bottom_bar";
import { TOPBAR_HEIGHT, BOTTOMBAR_HEIGHT } from "../constants";
import { SidePanel } from "./side_panel/side_panel";
import { sidePanelRegistry } from "./registries";

const { Component, useState } = owl;
const { useRef, useExternalListener } = owl.hooks;
const { xml, css } = owl.tags;

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet">
    <TopBar model="model" t-on-click="focusGrid"/>
    <Grid model="model" t-ref="grid"/>
    <BottomBar model="model" />
    <SidePanel t-if="sidePanel.isOpen"
           t-on-closeSidePanel="sidePanel.isOpen = false"
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
  data: PartialWorkbookDataWithVersion;
}

export class Spreadsheet extends Component<Props> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { TopBar, Grid, BottomBar, SidePanel };

  model = new GridModel(this.props.data);
  grid = useRef("grid");

  sidePanel = useState({ isOpen: false } as {
    isOpen: boolean;
    title?: string;
    Body?: any;
    Footer?: any;
  });
  constructor() {
    super(...arguments);
    useExternalListener(window as any, "resize", this.render);
  }

  mounted() {
    this.model.on("update", this, this.render);
    this.model.on("openSidePanel", this, this.openSidePanel);
  }

  willUnmount() {
    this.model.off("update", this);
    this.model.off("openSidePanel", this);
  }

  openSidePanel(ev) {
    const component = sidePanelRegistry.get(ev.panelName);
    this.sidePanel.title = component.title;
    this.sidePanel.Body = component.Body;
    this.sidePanel.Footer = component.Footer;
    this.sidePanel.isOpen = true;
  }
  focusGrid() {
    (<any>this.grid.comp).focus();
  }
}
