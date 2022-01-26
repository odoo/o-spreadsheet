import * as owl from "@odoo/owl";
import {
  BOTTOMBAR_HEIGHT,
  CF_ICON_EDGE_LENGTH,
  ICON_EDGE_LENGTH,
  TOPBAR_HEIGHT,
} from "../constants";
import { Model } from "../model";
import { ComposerSelection } from "../plugins/ui/edition";
import { SelectionMode } from "../plugins/ui/selection";
import { SpreadsheetEnv } from "../types";
import { Client } from "../types/collaborative/session";
import { StateUpdateMessage, TransportService } from "../types/collaborative/transport_service";
import { NotifyUIEvent } from "../types/ui";
import { BottomBar } from "./bottom_bar";
import { Grid } from "./grid";
import { LinkEditor } from "./link/link_editor";
import { SidePanel } from "./side_panel/side_panel";
import { TopBar } from "./top_bar";

const { Component, useState } = owl;
const { useExternalListener } = owl.hooks;
const { xml, css } = owl.tags;
const { useSubEnv, onMounted, onWillUnmount, onWillUpdateProps } = owl.hooks;

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

export type ComposerFocusType = "inactive" | "cellFocus" | "contentFocus";

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet" t-on-save-requested="save" t-on-keydown="onKeydown">
    <TopBar
    onClick="() => focusGrid()"
    onComposerContentFocused="(selection) => this.onTopBarComposerFocused(selection)"
    focusComposer="focusTopBarComposer"
    class="o-two-columns"/>
    <Grid
      model="model"
      sidePanelIsOpen="sidePanel.isOpen"
      linkEditorIsOpen="linkEditor.isOpen"
      onLinkEditorClosed="() => this.closeLinkEditor()"
      focusComposer="focusGridComposer"
      exposeFocus="(focus) => this._focusGrid = focus"
      onComposerContentFocused="() => this.onGridComposerContentFocused()"
      onGridComposerCellFocused="(content, selection) => this.onGridComposerCellFocused(content, selection)"
      t-att-class="{'o-two-columns': !sidePanel.isOpen}"/>
    <SidePanel t-if="sidePanel.isOpen"
      onCloseSidePanel="() => this.closeSidePanel()"
      component="sidePanel.component"
      panelProps="sidePanel.panelProps"/>
    <BottomBar onClick="() => this.focusGrid()" class="o-two-columns"/>
  </div>`;

const CSS = css/* scss */ `
  .o-spreadsheet {
    position: relative;
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
    width: ${ICON_EDGE_LENGTH}px;
    height: ${ICON_EDGE_LENGTH}px;
    opacity: 0.6;
    vertical-align: middle;
  }

  .o-cf-icon {
    width: ${CF_ICON_EDGE_LENGTH}px;
    height: ${CF_ICON_EDGE_LENGTH}px;
    vertical-align: sub;
  }
`;

interface Props {
  client?: Client;
  data?: any;
  stateUpdateMessages?: StateUpdateMessage[];
  transportService?: TransportService;
  isReadonly?: boolean;
  snapshotRequested?: boolean;
}

const t = (s: string): string => s;

export class Spreadsheet extends Component<Props, SpreadsheetEnv> {
  static template = TEMPLATE;
  static style = CSS;
  static components = { TopBar, Grid, BottomBar, SidePanel, LinkEditor };
  static _t = t;

  model = new Model(
    this.props.data,
    {
      evalContext: { env: this.env },
      transportService: this.props.transportService,
      client: this.props.client,
      isReadonly: this.props.isReadonly,
      snapshotRequested: this.props.snapshotRequested,
    },
    this.props.stateUpdateMessages
  );

  sidePanel = useState({ isOpen: false, panelProps: {} } as {
    isOpen: boolean;
    component?: string;
    panelProps: any;
  });
  linkEditor = useState({ isOpen: false });

  composer = useState({
    topBarFocus: "inactive",
    gridFocusMode: "inactive",
  } as { topBarFocus: "inactive" | "contentFocus"; gridFocusMode: "inactive" | "cellFocus" | "contentFocus" });

  private _focusGrid?: () => void;

  private keyDownMapping: { [key: string]: Function } = {
    "CTRL+H": () => this.toggleSidePanel("FindAndReplace", {}),
    "CTRL+F": () => this.toggleSidePanel("FindAndReplace", {}),
  };
  constructor(parent?: owl.Component<any, SpreadsheetEnv> | null, props: Props = {}) {
    super(parent, props);
    useSubEnv({
      openSidePanel: (panel: string, panelProps: any = {}) => this.openSidePanel(panel, panelProps),
      toggleSidePanel: (panel: string, panelProps: any = {}) =>
        this.toggleSidePanel(panel, panelProps),
      dispatch: this.model.dispatch,
      getters: this.model.getters,
      uuidGenerator: this.model.uuidGenerator,
      _t: Spreadsheet._t,
      clipboard: navigator.clipboard,
      export: this.model.exportData.bind(this.model),
      waitForIdle: this.model.waitForIdle.bind(this.model),
      exportXLSX: this.model.exportXLSX.bind(this.model),
      openLinkEditor: () => this.openLinkEditor(),
    });
    this.activateFirstSheet();
  }

  setup() {
    useExternalListener(window as any, "resize", this.render);
    useExternalListener(document.body, "keyup", this.onKeyup.bind(this));
    useExternalListener(window, "beforeunload", this.leaveCollaborativeSession.bind(this));
    onMounted(() => this.initiateModelEvents());
    onWillUnmount(() => this.leaveCollaborativeSession());
    onWillUpdateProps((nextProps: Props) => this.checkReadonly(nextProps));
  }

  get focusTopBarComposer(): Omit<ComposerFocusType, "cellFocus"> {
    return this.model.getters.getEditionMode() === "inactive"
      ? "inactive"
      : this.composer.topBarFocus;
  }

  get focusGridComposer(): ComposerFocusType {
    return this.model.getters.getEditionMode() === "inactive"
      ? "inactive"
      : this.composer.gridFocusMode;
  }

  initiateModelEvents() {
    this.model.on("update", this, this.render);
    this.model.on("notify-ui", this, this.onNotifyUI);
    this.model.on("unexpected-revision-id", this, () => this.trigger("unexpected-revision-id"));
    if (this.props.client) {
      this.model.joinSession(this.props.client);
    }
  }

  private onNotifyUI(payload: NotifyUIEvent) {
    switch (payload.type) {
      case "NOTIFICATION":
        this.env.notifyUser(payload.text);
        break;
    }
  }

  checkReadonly(nextProps: Props) {
    if (this.props.isReadonly !== nextProps.isReadonly) {
      this.model.updateReadOnly(nextProps.isReadonly);
    }
  }

  private leaveCollaborativeSession() {
    this.model.off("update", this);
    this.model.leaveSession();
  }

  private activateFirstSheet() {
    const sheetId = this.model.getters.getActiveSheetId();
    const [firstSheet] = this.model.getters.getSheets();
    if (firstSheet.id !== sheetId) {
      this.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: sheetId, sheetIdTo: firstSheet.id });
    }
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

  closeSidePanel() {
    this.sidePanel.isOpen = false;
    this.focusGrid();
  }

  openLinkEditor() {
    this.linkEditor.isOpen = true;
  }

  closeLinkEditor() {
    this.linkEditor.isOpen = false;
    this.focusGrid();
  }

  toggleSidePanel(panel: string, panelProps: any) {
    if (this.sidePanel.isOpen && panel === this.sidePanel.component) {
      this.sidePanel.isOpen = false;
      this.focusGrid();
    } else {
      this.openSidePanel(panel, panelProps);
    }
  }
  focusGrid() {
    if (!this._focusGrid) {
      throw new Error("_focusGrid should be exposed by the grid component");
    }
    this._focusGrid();
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
    let keyDownString = "";
    if (ev.ctrlKey || ev.metaKey) {
      keyDownString += "CTRL+";
    }
    keyDownString += ev.key.toUpperCase();

    let handler = this.keyDownMapping[keyDownString];
    if (handler) {
      ev.preventDefault();
      ev.stopPropagation();
      handler();
      return;
    }
  }

  onTopBarComposerFocused(selection: ComposerSelection) {
    if (this.model.getters.isReadonly()) {
      return;
    }
    this.composer.topBarFocus = "contentFocus";
    this.composer.gridFocusMode = "inactive";
    this.setComposerContent({ selection } || {});
    this.env.dispatch("UNFOCUS_SELECTION_INPUT");
  }

  onGridComposerContentFocused() {
    if (this.model.getters.isReadonly()) {
      return;
    }
    this.composer.topBarFocus = "inactive";
    this.composer.gridFocusMode = "contentFocus";
    this.setComposerContent({});
    this.env.dispatch("UNFOCUS_SELECTION_INPUT");
  }

  onGridComposerCellFocused(content?: string, selection?: ComposerSelection) {
    if (this.model.getters.isReadonly()) {
      return;
    }
    this.composer.topBarFocus = "inactive";
    this.composer.gridFocusMode = "cellFocus";
    this.setComposerContent({ content, selection } || {});
    this.env.dispatch("UNFOCUS_SELECTION_INPUT");
  }

  /**
   * Start the edition or update the content if it's already started.
   */
  private setComposerContent({
    content,
    selection,
  }: {
    content?: string | undefined;
    selection?: ComposerSelection;
  }) {
    if (this.model.getters.getEditionMode() === "inactive") {
      this.model.dispatch("START_EDITION", { text: content, selection });
    } else if (content) {
      this.model.dispatch("SET_CURRENT_CONTENT", { content, selection });
    }
  }
}
