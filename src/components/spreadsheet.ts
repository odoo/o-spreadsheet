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

  // last string that was cut or copied. It is necessary so we can make the
  // difference between a paste coming from the sheet itself, or from the
  // os clipboard
  private clipBoardString: string = "";

  constructor() {
    super(...arguments);
    const spreadsheetEnv: SpreadsheetEnv = {
      openSidePanel: (panel: string) => this.openSidePanel(panel)
    };
    useSubEnv({ spreadsheet: spreadsheetEnv });
    useExternalListener(window as any, "resize", this.render);
    useExternalListener(document.body, "cut", this.copy.bind(this, true));
    useExternalListener(document.body, "copy", this.copy.bind(this, false));
    useExternalListener(document.body, "paste", this.paste);
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

  copy(cut: boolean, ev: ClipboardEvent) {
    if (!this.grid.el!.contains(document.activeElement)) {
      return;
    }
    const type = cut ? "CUT" : "COPY";
    const target = this.model.getters.getSelectedZones();
    this.model.dispatch({ type, target });
    const content = this.model.getters.getClipboardContent();
    this.clipBoardString = content;
    ev.clipboardData!.setData("text/plain", content);
    ev.preventDefault();
  }

  paste(ev: ClipboardEvent) {
    if (!this.grid.el!.contains(document.activeElement)) {
      return;
    }
    const clipboardData = ev.clipboardData!;
    if (clipboardData.types.indexOf("text/plain") > -1) {
      const content = clipboardData.getData("text/plain");
      if (this.clipBoardString === content) {
        // the paste actually comes from o-spreadsheet itself
        const result = this.model.dispatch({
          type: "PASTE",
          target: this.model.getters.getSelectedZones()
        });
        if (result === "CANCELLED") {
          this.trigger("notify-user", {
            content: "This operation is not allowed with multiple selections."
          });
        }
      } else {
        this.model.dispatch({
          type: "PASTE_FROM_OS_CLIPBOARD",
          target: this.model.getters.getSelectedZones(),
          text: content
        });
      }
    }
  }
}
