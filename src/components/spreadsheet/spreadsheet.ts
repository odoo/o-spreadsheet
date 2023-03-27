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
  BACKGROUND_GRAY_COLOR,
  BOTTOMBAR_HEIGHT,
  CF_ICON_EDGE_LENGTH,
  ICON_EDGE_LENGTH,
  MAXIMAL_FREEZABLE_RATIO,
  MENU_SEPARATOR_BORDER_WIDTH,
  MENU_SEPARATOR_PADDING,
  SCROLLBAR_WIDTH,
  SEPARATOR_COLOR,
  TOPBAR_HEIGHT,
} from "../../constants";
import { ImageProvider } from "../../helpers/figures/images/image_provider";
import { Model } from "../../model";
import { ComposerSelection } from "../../plugins/ui_stateful/edition";
import { _lt } from "../../translation";
import { Pixel, SpreadsheetChildEnv } from "../../types";
import { NotifyUIEvent } from "../../types/ui";
import { BottomBar } from "../bottom_bar/bottom_bar";
import { SpreadsheetDashboard } from "../dashboard/dashboard";
import { Grid } from "../grid/grid";
import { css } from "../helpers/css";
import { SidePanel } from "../side_panel/side_panel/side_panel";
import { TopBar } from "../top_bar/top_bar";
import { instantiateClipboard } from "./../../helpers/clipboard/navigator_clipboard_wrapper";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

export type ComposerFocusType = "inactive" | "cellFocus" | "contentFocus";

css/* scss */ `
  .o-spreadsheet {
    position: relative;
    display: grid;
    grid-template-columns: auto 350px;
    color: #333;
    input {
      background-color: white;
    }
    .text-muted {
      color: grey !important;
    }
    button {
      color: #333;
    }
    .o-disabled {
      opacity: 0.4;
      pointer: default;
      pointer-events: none;
    }

    &,
    *,
    *:before,
    *:after {
      box-sizing: content-box;
    }
    .o-separator {
      border-bottom: ${MENU_SEPARATOR_BORDER_WIDTH}px solid ${SEPARATOR_COLOR};
      margin-top: ${MENU_SEPARATOR_PADDING}px;
      margin-bottom: ${MENU_SEPARATOR_PADDING}px;
    }
  }

  .o-two-columns {
    grid-column: 1 / 3;
  }

  .o-icon {
    width: ${ICON_EDGE_LENGTH}px;
    height: ${ICON_EDGE_LENGTH}px;
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

css/* scss */ `
  .o-grid {
    position: relative;
    overflow: hidden;
    background-color: ${BACKGROUND_GRAY_COLOR};
    &:focus {
      outline: none;
    }

    > canvas {
      border-top: 1px solid #e2e3e3;
      border-bottom: 1px solid #e2e3e3;
    }
    .o-scrollbar {
      &.corner {
        right: 0px;
        bottom: 0px;
        height: ${SCROLLBAR_WIDTH}px;
        width: ${SCROLLBAR_WIDTH}px;
        border-top: 1px solid #e2e3e3;
        border-left: 1px solid #e2e3e3;
      }
    }

    .o-grid-overlay {
      position: absolute;
      outline: none;
    }
  }
`;

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
  topBarFocus: Exclude<ComposerFocusType, "cellFocus">;
  gridFocusMode: ComposerFocusType;
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

  getStyle() {
    if (this.env.isDashboard()) {
      return `grid-template-rows: auto;`;
    }
    return `grid-template-rows: ${TOPBAR_HEIGHT}px auto ${BOTTOMBAR_HEIGHT + 1}px`;
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
    const fileStore = this.model.config.external.fileStore;
    useSubEnv({
      model: this.model,
      imageProvider: fileStore ? new ImageProvider(fileStore) : undefined,
      loadCurrencies: this.model.config.external.loadCurrencies,
      isDashboard: () => this.model.getters.isDashboard(),
      openSidePanel: this.openSidePanel.bind(this),
      toggleSidePanel: this.toggleSidePanel.bind(this),
      _t: Spreadsheet._t,
      clipboard: this.env.clipboard || instantiateClipboard(),
      startCellEdition: (content: string) => this.onGridComposerCellFocused(content),
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
    this.sidePanel.panelProps?.onCloseSidePanel?.();
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

  get gridHeight(): Pixel {
    const { height } = this.env.model.getters.getSheetViewDimension();
    return height;
  }
}

Spreadsheet.props = {
  model: Object,
};
