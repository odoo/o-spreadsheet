import * as owl from "@odoo/owl";
import { BOTTOMBAR_HEIGHT, TOPBAR_HEIGHT } from "../constants";
import { Model } from "../model";
import { BottomBar } from "./bottom_bar";
import { Grid } from "./grid";
import { SidePanel } from "./side_panel/side_panel";
import { TopBar } from "./top_bar";
import { SelectionMode } from "../plugins/ui/selection";
import { SOCT4 } from "../soct4";
import { NetworkCommand, OTMessage, OTResponse } from "../types";
import { OtClient } from "../ot_client";

const { Component, useState } = owl;
const { useRef, useExternalListener } = owl.hooks;
const { xml, css } = owl.tags;
const { useSubEnv } = owl.hooks;

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet" t-on-save-requested="save" t-on-keydown="onKeydown">
    <TopBar t-on-click="focusGrid" class="o-two-columns"/>
    <Grid model="model" t-ref="grid" t-att-class="{'o-two-columns': !sidePanel.isOpen}"/>
    <SidePanel t-if="sidePanel.isOpen"
           t-on-close-side-panel="sidePanel.isOpen = false"
           component="sidePanel.component"
           panelProps="sidePanel.panelProps"/>
    <BottomBar t-on-click="focusGrid" class="o-two-columns"/>
  </div>`;

const CSS = css/* scss */ `
  .o-spreadsheet {
    display: grid;
    grid-template-rows: ${TOPBAR_HEIGHT}px auto ${BOTTOMBAR_HEIGHT + 1}px;
    grid-template-columns: auto 350px;
    * {
      font-family: "Roboto", "RobotoDraft", Helvetica, Arial, sans-serif;
    }
    &,
    *,
    *:before,
    *:after {
      box-sizing: content-box;
    }
  }

  .o-two-columns {
    grid-column: 1 / 3;
  }

  .o-icon {
    width: 18px;
    height: 18px;
    opacity: 0.6;
  }
`;

interface Props {
  data?: any;
  sendCommand?: (networkCommand: NetworkCommand) => void;
  getTicket?: () => Promise<number>;
}

const t = (s: string): string => s;

export class Spreadsheet extends Component<Props> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { TopBar, Grid, BottomBar, SidePanel };
  static _t = t;

  model = new Model(this.props.data, {
    notifyUser: (content: string) => this.trigger("notify-user", { content }),
    askConfirmation: (content: string, confirm: () => any, cancel?: () => any) =>
      this.trigger("ask-confirmation", { content, confirm, cancel }),
    editText: (title: string, placeholder: string, callback: (text: string | null) => any) =>
      this.trigger("edit-text", { title, placeholder, callback }),
    openSidePanel: (panel: string, panelProps: any = {}) => this.openSidePanel(panel, panelProps),
    evalContext: { env: this.env },
    network: {
      sendCommand: (type: string, payload?: any) =>
        this.trigger("network-command", { type, payload }),
    },
  });

  soct4: SOCT4;
  otClient: OtClient;
  grid = useRef("grid");

  sidePanel = useState({ isOpen: false, panelProps: {} } as {
    isOpen: boolean;
    component?: string;
    panelProps: any;
  });

  // last string that was cut or copied. It is necessary so we can make the
  // difference between a paste coming from the sheet itself, or from the
  // os clipboard
  private clipBoardString: string = "";

  constructor() {
    super(...arguments);
    useSubEnv({
      openSidePanel: (panel: string, panelProps: any = {}) => this.openSidePanel(panel, panelProps),
      toggleSidePanel: (panel: string, panelProps: any = {}) =>
        this.toggleSidePanel(panel, panelProps),
      dispatch: this.model.dispatch,
      getters: this.model.getters,
      _t: Spreadsheet._t,
      clipboard: navigator.clipboard,
      export: this.model.exportData.bind(this.model),
    });
    useExternalListener(window as any, "resize", this.render);
    useExternalListener(document.body, "cut", this.copy.bind(this, true));
    useExternalListener(document.body, "copy", this.copy.bind(this, false));
    useExternalListener(document.body, "paste", this.paste);
    useExternalListener(document.body, "keyup", this.onKeyup.bind(this));

    this.soct4 = new SOCT4(this.model, this.broadcast.bind(this), this.getTicket.bind(this));
    this.otClient = new OtClient(0, this.broadcast.bind(this), this.model);
    this.model.on("command-dispatched", this, (ev) => {
      // this.soct4.localExecution(ev.command);
      this.otClient.localCommand(ev.command);
    });
  }

  // sequentialReception(networkCommand: Required<NetworkCommand>) {
  sequentialReception(message: OTResponse) {
    // this.soct4.sequentialReception(networkCommand);
    this.otClient.onReceived(message);
  }

  // private broadcast(newtworkCommand: NetworkCommand) {
  private broadcast(message: OTMessage) {
    // if (this.props.sendCommand !== undefined) {
    //   this.props.sendCommand(newtworkCommand);
    // }
    this.trigger("network-command", { command: message });
  }

  private async getTicket() {
    if (this.props.getTicket !== undefined) {
      return this.props.getTicket();
    }
    return -1;
  }

  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
  }

  destroy() {
    this.model.destroy();
    super.destroy();
  }

  openSidePanel(panel: string, panelProps: any) {
    this.sidePanel.component = panel;
    this.sidePanel.panelProps = panelProps;
    this.sidePanel.isOpen = true;
  }

  toggleSidePanel(panel: string, panelProps: any) {
    if (this.sidePanel.isOpen && panel === this.sidePanel.component) {
      this.sidePanel.isOpen = false;
    } else {
      this.openSidePanel(panel, panelProps);
    }
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
    this.model.dispatch(type, { target });
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
      const target = this.model.getters.getSelectedZones();
      if (this.clipBoardString === content) {
        // the paste actually comes from o-spreadsheet itself
        this.model.dispatch("PASTE", { target, interactive: true });
      } else {
        this.model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
          target,
          text: content,
        });
      }
    }
  }

  save() {
    this.trigger("save-content", {
      data: this.model.exportData(),
    });
  }

  onKeyup(ev: KeyboardEvent) {
    if (ev.key === "Control" && this.model.getters.getSelectionMode() !== SelectionMode.expanding) {
      this.model.dispatch("STOP_SELECTION");
    }
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Control" && !ev.repeat) {
      this.model.dispatch(
        this.model.getters.getSelectionMode() === SelectionMode.idle
          ? "PREPARE_SELECTION_EXPANSION"
          : "START_SELECTION_EXPANSION"
      );
    }
  }
}
