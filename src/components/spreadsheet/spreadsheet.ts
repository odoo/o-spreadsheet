import {
  Component,
  onMounted,
  onPatched,
  onWillUnmount,
  useExternalListener,
  useState,
  useSubEnv,
} from "@odoo/owl";
import {
  BOTTOMBAR_HEIGHT,
  CF_ICON_EDGE_LENGTH,
  ICON_EDGE_LENGTH,
  MAXIMAL_FREEZABLE_RATIO,
  MENU_SEPARATOR_BORDER_WIDTH,
  MENU_SEPARATOR_PADDING,
  TOPBAR_HEIGHT,
} from "../../constants";
import { Model } from "../../model";
import { ComposerSelection } from "../../plugins/ui/edition";
import { _lt } from "../../translation";
import { SpreadsheetChildEnv } from "../../types";
import { NotifyUIEvent } from "../../types/ui";
import { BottomBar } from "../bottom_bar/bottom_bar";
import { SpreadsheetDashboard } from "../dashboard/dashboard";
import { Grid } from "../grid/grid";
import { css } from "../helpers/css";
import { SidePanel } from "../side_panel/side_panel/side_panel";
import { TopBar } from "../top_bar/top_bar";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

export type ComposerFocusType = "inactive" | "cellFocus" | "contentFocus";

css/* scss */ `
  .o-spreadsheet {
    position: relative;
    background-color: var(--BACKGROUND_GRAY_COLOR);
    * {
      font-family: "Roboto", "RobotoDraft", Helvetica, Arial, sans-serif;
    }
    &,
    *,
    *:before,
    *:after {
      box-sizing: content-box;
    }
    .o-separator {
      border-bottom: ${MENU_SEPARATOR_BORDER_WIDTH}px solid #e0e2e4;
      margin-top: ${MENU_SEPARATOR_PADDING}px;
      margin-bottom: ${MENU_SEPARATOR_PADDING}px;
    }

    &.o-spreadsheet-dashboard {
      display: block;
    }

    &.o-spreadsheet-normal {
      display: grid;
      grid-template-columns: auto 350px;
      grid-template-rows: ${TOPBAR_HEIGHT}px auto ${BOTTOMBAR_HEIGHT + 1}px;
      grid-template-areas:
        "top-bar top-bar"
        "grid grid"
        "bottom-bar bottom-bar";

      &.o-spreadsheet-with-side-panel {
        grid-template-areas:
          "top-bar top-bar"
          "grid side-panel"
          "bottom-bar bottom-bar";
      }

      .o-spreadsheet-topbar {
        grid-area: top-bar;
      }

      .o-spreadsheet-grid-container {
        grid-area: grid;
        position: relative;
        overflow: hidden;
        &:focus {
          outline: none;
        }

        > canvas {
          border-top: 1px solid #e2e3e3;
          border-bottom: 1px solid #e2e3e3;
        }
      }

      .o-spreadsheet-side-panel-container {
        grid-area: side-panel;
      }

      .o-spreadsheet-bottom-bar {
        grid-area: bottom-bar;
      }
    }
  }

  .o-spreadsheet-icon {
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

// -----------------------------------------------------------------------------
// GRID STYLE
// -----------------------------------------------------------------------------

export interface SpreadsheetProps {
  model: Model;
}

const t = (s: string): string => s;

interface SidePanelState {
  isOpen: boolean;
  component?: string;
  panelProps: any;
}

interface ComposerState {
  topBarFocus: "inactive" | "contentFocus";
  gridFocusMode: "inactive" | "cellFocus" | "contentFocus";
}

export class Spreadsheet extends Component<SpreadsheetProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Spreadsheet";
  static components = { TopBar, Grid, BottomBar, SidePanel, SpreadsheetDashboard };
  static _t = t;

  sidePanel!: SidePanelState;
  composer!: ComposerState;

  private _focusGrid?: () => void;

  private keyDownMapping!: { [key: string]: Function };

  private isViewportTooSmall: boolean = false;

  get model(): Model {
    return this.props.model;
  }

  get rootClass(): string {
    if (this.env.isDashboard()) {
      return "o-spreadsheet-dashboard";
    }
    return "o-spreadsheet-normal" + (this.sidePanel.isOpen ? " o-spreadsheet-with-side-panel" : "");
  }

  setup() {
    this.sidePanel = useState({ isOpen: false, panelProps: {} });
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
      isDashboard: () => this.model.getters.isDashboard(),
      openSidePanel: this.openSidePanel.bind(this),
      toggleSidePanel: this.toggleSidePanel.bind(this),
      _t: Spreadsheet._t,
      clipboard: navigator.clipboard,
    });

    useExternalListener(window as any, "resize", () => this.render(true));
    useExternalListener(window, "beforeunload", this.unbindModelEvents.bind(this));

    this.bindModelEvents();
    onMounted(() => {
      this.checkViewportSize();
    });
    onWillUnmount(() => this.unbindModelEvents());
    onPatched(() => {
      this.checkViewportSize();
    });
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

  private checkViewportSize() {
    const { xRatio, yRatio } = this.env.model.getters.getFrozenSheetViewRatio(
      this.env.model.getters.getActiveSheetId()
    );
    if (yRatio > MAXIMAL_FREEZABLE_RATIO || xRatio > MAXIMAL_FREEZABLE_RATIO) {
      if (this.isViewportTooSmall) {
        return;
      }
      this.env.notifyUser({
        text: _lt(
          "The current window is too small to display this sheet properly. Consider resizing your browser window or adjusting frozen rows and columns."
        ),
        tag: "viewportTooSmall",
      });
      this.isViewportTooSmall = true;
    } else {
      this.isViewportTooSmall = false;
    }
  }

  private onNotifyUI(payload: NotifyUIEvent) {
    switch (payload.type) {
      case "ERROR":
        this.env.raiseError(payload.text);
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

  onKeydown(ev: KeyboardEvent) {
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

Spreadsheet.props = {
  model: Object,
};
