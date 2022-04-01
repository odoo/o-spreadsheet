import {
  Component,
  onMounted,
  onWillUnmount,
  useExternalListener,
  useState,
  useSubEnv,
  xml,
} from "@odoo/owl";
import {
  BOTTOMBAR_HEIGHT,
  CF_ICON_EDGE_LENGTH,
  ICON_EDGE_LENGTH,
  TOPBAR_HEIGHT,
} from "../constants";
import { ContextMenu, menuProvider } from "../controllers/menu_controller";
import { useSharedUI } from "../controllers/providers";
import { Model } from "../model";
import { ComposerSelection } from "../plugins/ui/edition";
import { SpreadsheetChildEnv, WorkbookData } from "../types";
import { NotifyUIEvent } from "../types/ui";
import { BottomBar } from "./bottom_bar";
import { Grid } from "./grid";
import { css } from "./helpers/css";
import { LinkEditor } from "./link/link_editor";
import { Menu } from "./menu";
import { SidePanel } from "./side_panel/side_panel";
import { TopBar } from "./top_bar";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

export type ComposerFocusType = "inactive" | "cellFocus" | "contentFocus";

const TEMPLATE = xml/* xml */ `
  <div class="o-spreadsheet"  t-on-keydown="onKeydown">
    <TopBar
      onClick="() => this.focusGrid()"
      onComposerContentFocused="(selection) => this.onTopBarComposerFocused(selection)"
      focusComposer="focusTopBarComposer"/>
    <Grid
      sidePanelIsOpen="sidePanel.isOpen"
      linkEditorIsOpen="linkEditor.isOpen"
      onLinkEditorClosed="() => this.closeLinkEditor()"
      onSaveRequested="() => this.save()"
      focusComposer="focusGridComposer"
      exposeFocus="(focus) => this._focusGrid = focus"
      onComposerContentFocused="() => this.onGridComposerContentFocused()"
      onGridComposerCellFocused="(content, selection) => this.onGridComposerCellFocused(content, selection)"/>
    <SidePanel t-if="sidePanel.isOpen"
      onCloseSidePanel="() => this.closeSidePanel()"
      component="sidePanel.component"
      panelProps="sidePanel.panelProps"/>
    <BottomBar onClick="() => this.focusGrid()"/>
    <Menu t-if="contextMenu.state.isOpen"
      menuItems="contextMenu.state.menuItems"
      position="contextMenu.state.position"/>
  </div>`;

css/* scss */ `
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

export interface SpreadsheetProps {
  model: Model;
  exposeSpreadsheet?: (spreadsheet: Spreadsheet) => void;
  onUnexpectedRevisionId?: () => void;
  onContentSaved?: (data: WorkbookData) => void;
}

const t = (s: string): string => s;

interface SidePanelState {
  isOpen: boolean;
  component?: string;
  panelProps: any;
}

interface LinkEditorState {
  isOpen: boolean;
}

interface ComposerState {
  topBarFocus: "inactive" | "contentFocus";
  gridFocusMode: "inactive" | "cellFocus" | "contentFocus";
}

export class Spreadsheet extends Component<SpreadsheetProps, SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static components = { TopBar, Grid, BottomBar, SidePanel, LinkEditor, Menu };
  static _t = t;

  model!: Model;

  sidePanel!: SidePanelState;
  linkEditor!: LinkEditorState;
  composer!: ComposerState;
  contextMenu!: ContextMenu;

  private _focusGrid?: () => void;
  private keyDownMapping!: { [key: string]: Function };

  setup() {
    this.props.exposeSpreadsheet?.(this);
    this.model = this.props.model;
    this.sidePanel = useState({ isOpen: false, panelProps: {} });
    this.linkEditor = useState({ isOpen: false });
    this.composer = useState({
      topBarFocus: "inactive",
      gridFocusMode: "inactive",
    });
    this.keyDownMapping = {
      "CTRL+H": () => this.toggleSidePanel("FindAndReplace", {}),
      "CTRL+F": () => this.toggleSidePanel("FindAndReplace", {}),
    };
    useSubEnv({
      model: this.model,
      openSidePanel: this.openSidePanel.bind(this),
      toggleSidePanel: this.toggleSidePanel.bind(this),
      openLinkEditor: this.openLinkEditor.bind(this),
      _t: Spreadsheet._t,
      clipboard: navigator.clipboard,
    });
    this.contextMenu = useSharedUI(menuProvider);
    useExternalListener(window as any, "resize", () => this.render(true));
    useExternalListener(document.body, "keyup", this.onKeyup.bind(this));
    useExternalListener(window, "beforeunload", this.unbindModelEvents.bind(this));
    onMounted(() => this.bindModelEvents());
    onWillUnmount(() => this.unbindModelEvents());
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

  private bindModelEvents() {
    this.model.on("update", this, () => this.render(true));
    this.model.on("notify-ui", this, this.onNotifyUI);
  }

  private unbindModelEvents() {
    this.model.off("update", this);
    this.model.off("notify-ui", this);
  }

  private onNotifyUI(payload: NotifyUIEvent) {
    switch (payload.type) {
      case "NOTIFICATION":
        this.env.notifyUser(payload.text);
        break;
    }
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
    this.props.onContentSaved?.(this.model.exportData());
  }

  onKeyup(ev: KeyboardEvent) {
    if (ev.key === "Control") {
      this.model.dispatch("STOP_SELECTION_INPUT");
    }
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Control" && !ev.repeat) {
      this.model.dispatch("PREPARE_SELECTION_INPUT_EXPANSION");
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
    this.model.dispatch("UNFOCUS_SELECTION_INPUT");
    this.composer.topBarFocus = "contentFocus";
    this.composer.gridFocusMode = "inactive";
    this.setComposerContent({ selection } || {});
  }

  onGridComposerContentFocused() {
    if (this.model.getters.isReadonly()) {
      return;
    }
    this.model.dispatch("UNFOCUS_SELECTION_INPUT");
    this.composer.topBarFocus = "inactive";
    this.composer.gridFocusMode = "contentFocus";
    this.setComposerContent({});
  }

  onGridComposerCellFocused(content?: string, selection?: ComposerSelection) {
    if (this.model.getters.isReadonly()) {
      return;
    }
    this.model.dispatch("UNFOCUS_SELECTION_INPUT");
    this.composer.topBarFocus = "inactive";
    this.composer.gridFocusMode = "cellFocus";
    this.setComposerContent({ content, selection } || {});
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
