import {
  Component,
  onMounted,
  onPatched,
  onWillUnmount,
  onWillUpdateProps,
  useEffect,
  useExternalListener,
  useRef,
  useSubEnv,
} from "@odoo/owl";
import { GROUP_LAYER_WIDTH, MAXIMAL_FREEZABLE_RATIO, SCROLLBAR_WIDTH } from "../../constants";
import { batched } from "../../helpers";
import { ImageProvider } from "../../helpers/figures/images/image_provider";
import { Model } from "../../model";
import { Store, useStore, useStoreProvider } from "../../store_engine";
import { ModelStore } from "../../stores";
import { NotificationStore, NotificationStoreMethods } from "../../stores/notification_store";
import { ScreenWidthStore } from "../../stores/screen_width_store";
import { _t } from "../../translation";
import {
  CSSProperties,
  HeaderGroup,
  InformationNotification,
  Pixel,
  SpreadsheetChildEnv,
} from "../../types";
import { BottomBar } from "../bottom_bar/bottom_bar";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { SpreadsheetDashboard } from "../dashboard/dashboard";
import { unregisterChartJsExtensions } from "../figures/chart/chartJs/chart_js_extension";
import { FullScreenFigure } from "../full_screen_figure/full_screen_figure";
import { Grid } from "../grid/grid";
import { HeaderGroupContainer } from "../header_group/header_group_container";
import { cssPropertiesToCss } from "../helpers/css";
import { isMobileOS } from "../helpers/dom_helpers";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { useScreenWidth } from "../helpers/screen_width_hook";
import { DEFAULT_SIDE_PANEL_SIZE, SidePanelStore } from "../side_panel/side_panel/side_panel_store";
import { SidePanels } from "../side_panel/side_panels/side_panels";
import { SmallBottomBar } from "../small_bottom_bar/small_bottom_bar";
import { TopBar } from "../top_bar/top_bar";
import { instantiateClipboard } from "./../../helpers/clipboard/navigator_clipboard_wrapper";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

// FIXME Used in encoding in css
// const CARET_DOWN_SVG = /*xml*/ `
// <svg xmlns='http://www.w3.org/2000/svg' width='7' height='4' viewBox='0 0 7 4'>
//   <polygon fill='%23374151' points='3.5 4 7 0 0 0'/>
// </svg>
// `;

export interface SpreadsheetProps extends Partial<NotificationStoreMethods> {
  model: Model;
}

export class Spreadsheet extends Component<SpreadsheetProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Spreadsheet";
  static props = {
    model: Object,
    notifyUser: { type: Function, optional: true },
    raiseError: { type: Function, optional: true },
    askConfirmation: { type: Function, optional: true },
  };
  static components = {
    TopBar,
    Grid,
    BottomBar,
    SmallBottomBar,
    SidePanels,
    SpreadsheetDashboard,
    HeaderGroupContainer,
    FullScreenFigure,
  };

  sidePanel!: Store<SidePanelStore>;
  spreadsheetRef = useRef("spreadsheet");
  spreadsheetRect = useSpreadsheetRect();

  private _focusGrid?: () => void;

  private isViewportTooSmall: boolean = false;
  private notificationStore!: Store<NotificationStore>;
  private composerFocusStore!: Store<ComposerFocusStore>;

  get model(): Model {
    return this.props.model;
  }

  getStyle(): string {
    const properties: CSSProperties = {};
    if (this.env.isDashboard()) {
      properties["grid-template-rows"] = `auto`;
    } else {
      properties["grid-template-rows"] = `min-content auto min-content`;
    }
    const columnWidth = this.sidePanel.mainPanel
      ? `${this.sidePanel.totalPanelSize || DEFAULT_SIDE_PANEL_SIZE}px`
      : "auto";
    properties["grid-template-columns"] = `auto ${columnWidth}`;

    return cssPropertiesToCss(properties);
  }

  setup() {
    if (!("isSmall" in this.env)) {
      const screenSize = useScreenWidth();
      useSubEnv({
        get isSmall() {
          return screenSize.isSmall;
        },
      } satisfies Partial<SpreadsheetChildEnv>);
    }

    const stores = useStoreProvider();
    stores.inject(ModelStore, this.model);

    const env = this.env;
    stores.get(ScreenWidthStore).setSmallThreshhold(() => {
      return env.isSmall;
    });

    this.notificationStore = useStore(NotificationStore);
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.sidePanel = useStore(SidePanelStore);
    const fileStore = this.model.config.external.fileStore;

    useSubEnv({
      model: this.model,
      imageProvider: fileStore ? new ImageProvider(fileStore) : undefined,
      loadCurrencies: this.model.config.external.loadCurrencies,
      loadLocales: this.model.config.external.loadLocales,
      isDashboard: () => this.model.getters.isDashboard(),
      openSidePanel: this.sidePanel.open.bind(this.sidePanel),
      replaceSidePanel: this.sidePanel.replace.bind(this.sidePanel),
      toggleSidePanel: this.sidePanel.toggle.bind(this.sidePanel),
      clipboard: this.env.clipboard || instantiateClipboard(),
      startCellEdition: (content?: string) =>
        this.composerFocusStore.focusActiveComposer({ content }),
      notifyUser: (notification) => this.notificationStore.notifyUser(notification),
      askConfirmation: (text, confirm, cancel) =>
        this.notificationStore.askConfirmation(text, confirm, cancel),
      raiseError: (text, cb) => this.notificationStore.raiseError(text, cb),
      isMobile: isMobileOS,
    } satisfies Partial<SpreadsheetChildEnv>);

    this.notificationStore.updateNotificationCallbacks({ ...this.props });

    useEffect(
      () => {
        /**
         * Only refocus the grid if the active element is not a child of the spreadsheet
         * (i.e. activeElement is outside of the spreadsheetRef component)
         * and spreadsheet is a child of that element. Anything else means that the focus
         * is on an element that needs to keep it.
         */
        if (
          !this.spreadsheetRef.el!.contains(document.activeElement) &&
          document.activeElement?.contains(this.spreadsheetRef.el!)
        ) {
          this.focusGrid();
        }
      },
      () => [this.env.model.getters.getActiveSheetId()]
    );

    useExternalListener(window, "resize", () => this.render(true));
    // For some reason, the wheel event is not properly registered inside templates
    // in Chromium-based browsers based on chromium 125
    // This hack ensures the event declared in the template is properly registered/working
    useExternalListener(document.body, "wheel", () => {});

    this.bindModelEvents();

    onWillUpdateProps((nextProps: SpreadsheetProps) => {
      if (nextProps.model !== this.props.model) {
        throw new Error("Changing the props model is not supported at the moment.");
      }
      if (
        nextProps.notifyUser !== this.props.notifyUser ||
        nextProps.askConfirmation !== this.props.askConfirmation ||
        nextProps.raiseError !== this.props.raiseError
      ) {
        this.notificationStore.updateNotificationCallbacks({ ...nextProps });
      }
    });

    const render = batched(this.render.bind(this, true));
    onMounted(() => {
      this.sidePanel.open("Settings");
      this.checkViewportSize();
      stores.on("store-updated", this, render);
      resizeObserver.observe(this.spreadsheetRef.el!);
    });
    onWillUnmount(() => {
      this.unbindModelEvents();
      stores.off("store-updated", this);
      resizeObserver.disconnect();
      unregisterChartJsExtensions();
    });
    onPatched(() => {
      this.checkViewportSize();
    });
    const resizeObserver = new ResizeObserver(() => {
      this.sidePanel.changeSpreadsheetWidth(this.spreadsheetRect.width);
    });
  }

  private bindModelEvents() {
    this.model.on("update", this, () => this.render(true));
    this.model.on("notify-ui", this, (notification: InformationNotification) =>
      this.notificationStore.notifyUser(notification)
    );
    this.model.on("raise-error-ui", this, ({ text }) => this.notificationStore.raiseError(text));
  }

  private unbindModelEvents() {
    this.model.off("update", this);
    this.model.off("notify-ui", this);
    this.model.off("raise-error-ui", this);
  }

  private checkViewportSize() {
    const { xRatio, yRatio } = this.env.model.getters.getFrozenSheetViewRatio(
      this.env.model.getters.getActiveSheetId()
    );

    if (!isFinite(xRatio) || !isFinite(yRatio)) {
      // before mounting, the ratios can be NaN or Infinity if the viewport size is 0
      return;
    }

    if (yRatio > MAXIMAL_FREEZABLE_RATIO || xRatio > MAXIMAL_FREEZABLE_RATIO) {
      if (this.isViewportTooSmall) {
        return;
      }
      this.notificationStore.notifyUser({
        text: _t(
          "The current window is too small to display this sheet properly. Consider resizing your browser window or adjusting frozen rows and columns."
        ),
        type: "warning",
        sticky: false,
      });
      this.isViewportTooSmall = true;
    } else {
      this.isViewportTooSmall = false;
    }
  }

  focusGrid() {
    if (!this._focusGrid) {
      return;
    }
    this._focusGrid();
  }

  get gridHeight(): Pixel {
    return this.env.model.getters.getSheetViewDimension().height;
  }

  get gridContainerStyle(): string {
    const gridColSize = GROUP_LAYER_WIDTH * this.rowLayers.length;
    const gridRowSize = GROUP_LAYER_WIDTH * this.colLayers.length;
    return cssPropertiesToCss({
      "grid-template-columns": `${gridColSize ? gridColSize + 2 : 0}px auto`, // +2: margins
      "grid-template-rows": `${gridRowSize ? gridRowSize + 2 : 0}px auto`,
    });
  }

  get rowLayers(): HeaderGroup[][] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getVisibleGroupLayers(sheetId, "ROW");
  }

  get colLayers(): HeaderGroup[][] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getVisibleGroupLayers(sheetId, "COL");
  }

  getGridSize() {
    const topBarHeight =
      this.spreadsheetRef.el
        ?.querySelector(".o-spreadsheet-topbar-wrapper")
        ?.getBoundingClientRect().height || 0;
    const bottomBarHeight =
      this.spreadsheetRef.el
        ?.querySelector(".o-spreadsheet-bottombar-wrapper")
        ?.getBoundingClientRect().height || 0;

    const gridWidth =
      this.spreadsheetRef.el?.querySelector(".o-grid")?.getBoundingClientRect().width || 0;
    const gridHeight =
      (this.spreadsheetRef.el?.getBoundingClientRect().height || 0) -
      (this.spreadsheetRef.el?.querySelector(".o-column-groups")?.getBoundingClientRect().height ||
        0) -
      topBarHeight -
      bottomBarHeight;
    return {
      width: Math.max(gridWidth - SCROLLBAR_WIDTH, 0),
      height: Math.max(gridHeight - SCROLLBAR_WIDTH, 0),
    };
  }
}
