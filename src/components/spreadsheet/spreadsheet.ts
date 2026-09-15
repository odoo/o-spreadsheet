import {
  onMounted,
  onPatched,
  onWillUnmount,
  onWillUpdateProps,
  PluginInstance,
  providePlugins,
  signal,
  Signal,
  useEffect,
  useListener,
  usePlugin,
  useProps,
} from "@odoo/owl";
import { GROUP_LAYER_WIDTH, MAXIMAL_FREEZABLE_RATIO } from "../../constants";
import { DARK_MODE_FILTER_STRING } from "../../helpers/color";
import { unregisterChartJsExtensions } from "../../helpers/figures/charts/chart_js_extension";
import { ImageProvider } from "../../helpers/figures/images/image_provider";
import { batched } from "../../helpers/misc";
import { providePluginsIfNotPresent, render } from "../../helpers/owl3_helpers";
import { Model } from "../../model";
import { Component, useLayoutEffect, useSubEnv } from "../../owl3_compatibility_layer";
import { ModelPlugin } from "../../owl_plugins/model_owl_plugin";
import { NotificationPlugin } from "../../owl_plugins/notification_owl_plugin";
import { PrintPlugin } from "../../owl_plugins/print_owl_plugin";
import { useStore, useStoreProvider } from "../../store_engine/store_hooks";
import { globalStores } from "../../store_engine/store_registries";
import { ClipboardStore } from "../../stores/clipboard_store";
import { ModelStore } from "../../stores/model_store";
import { ScreenWidthStore } from "../../stores/screen_width_store";
import { ViewportsStore } from "../../stores/viewports_store";
import { ZoomStore } from "../../stores/zoom_store";
import { _t } from "../../translation";
import { CommandResult } from "../../types/commands";
import { InformationNotification } from "../../types/env";
import { CSSProperties, HeaderGroup, Pixel } from "../../types/misc";
import { PropsOf } from "../../types/props_of";
import { ColorThemeName } from "../../types/rendering";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { NotificationCallbacks } from "../../types/stores/notification_store_methods";
import { BottomBar } from "../bottom_bar/bottom_bar";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { SpreadsheetDashboard } from "../dashboard/dashboard";
import { FullScreenFigure } from "../full_screen_figure/full_screen_figure";
import { Grid } from "../grid/grid";
import { HeaderGroupContainer } from "../header_group/header_group_container";
import { cssPropertiesToCss } from "../helpers/css";
import {
  getElBoundingRect,
  isMobileOS,
  keyboardEventToShortcutString,
  zoomCorrectedElementRect,
} from "../helpers/dom_helpers";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { useScreenWidth } from "../helpers/screen_width_hook";
import { PopoverContainerPlugin } from "../popover/popover_container_owl_plugin";
import { types } from "../props_validation";
import { DEFAULT_SIDE_PANEL_SIZE, SidePanelStore } from "../side_panel/side_panel/side_panel_store";
import { SidePanels } from "../side_panel/side_panels/side_panels";
import { SmallBottomBar } from "../small_bottom_bar/small_bottom_bar";
import { SpreadsheetPrint } from "../spreadsheet_print/spreadsheet_print";
import { TopBar } from "../top_bar/top_bar";
import { instantiateClipboard } from "./../../helpers/clipboard/navigator_clipboard_wrapper";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

export class Spreadsheet extends Component {
  static template = "o-spreadsheet-Spreadsheet";
  protected props = useProps({
    model: types.Model(),
    notifyUser: types.function<NotificationCallbacks["notifyUser"]>().optional(),
    raiseError: types.function<NotificationCallbacks["raiseError"]>().optional(),
    askConfirmation: types.function<NotificationCallbacks["askConfirmation"]>().optional(),
  });
  static components = {
    TopBar,
    Grid,
    BottomBar,
    SmallBottomBar,
    SidePanels,
    SpreadsheetDashboard,
    HeaderGroupContainer,
    FullScreenFigure,
    SpreadsheetPrint,
  };

  sidePanel!: Store<SidePanelStore>;
  spreadsheetRef = signal.ref();
  spreadsheetRect = useSpreadsheetRect();

  private _focusGrid?: () => void;

  private isViewportTooSmall: boolean = false;
  private notificationPlugin!: PluginInstance<typeof NotificationPlugin>;
  private printPlugin!: PluginInstance<typeof PrintPlugin>;
  private modelPlugin!: PluginInstance<typeof ModelPlugin>;
  private composerFocusStore!: Store<ComposerFocusStore>;
  private viewStore!: Store<ViewportsStore>;
  private zoomStore!: Store<ZoomStore>;

  get model(): Signal<Model> {
    return this.modelPlugin.model;
  }

  getStyle(): string {
    const properties: CSSProperties = {};
    const scrollbarWidth = this.zoomStore.scrollBarWidth;
    properties["--os-scrollbar-width"] = `${scrollbarWidth}px`;
    properties["--os-dark-mode-filter"] = DARK_MODE_FILTER_STRING;
    properties["color-scheme"] = this.colorScheme;

    if (this.printPlugin.printModeEnabled()) {
      properties["display"] = `block`;
    } else {
      if (this.model().getters.isDashboard()) {
        properties["grid-template-rows"] = `auto`;
      } else {
        properties["grid-template-rows"] = `min-content auto min-content`;
      }
      const columnWidth = this.sidePanel.mainPanel
        ? `${this.sidePanel.totalPanelSize || DEFAULT_SIDE_PANEL_SIZE}px`
        : "auto";
      properties["grid-template-columns"] = `auto ${columnWidth}`;
    }

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

    providePlugins([PopoverContainerPlugin, ModelPlugin, PrintPlugin], {
      getPopoverContainerRect: () => getElBoundingRect(this.spreadsheetRef()),
      model: this.props.model,
    });
    this.modelPlugin = usePlugin(ModelPlugin);
    this.printPlugin = usePlugin(PrintPlugin);

    const stores = useStoreProvider();
    stores.inject(ModelStore, this.model());
    this.viewStore = useStore(ViewportsStore);
    this.zoomStore = useStore(ZoomStore);

    const env = this.env;
    stores.get(ScreenWidthStore).setSmallThreshhold(() => {
      return env.isSmall;
    });

    providePluginsIfNotPresent([NotificationPlugin]);
    this.notificationPlugin = usePlugin(NotificationPlugin);
    this.composerFocusStore = useStore(ComposerFocusStore);
    useStore(ClipboardStore);
    this.sidePanel = useStore(SidePanelStore);
    for (const store of globalStores.getAll()) {
      useStore(store);
    }
    const fileStore = this.model().config.external.fileStore;

    useSubEnv({
      imageProvider: fileStore ? new ImageProvider(fileStore) : undefined,
      loadCurrencies: this.model().config.external.loadCurrencies,
      loadLocales: this.model().config.external.loadLocales,
      openSidePanel: this.sidePanel.open.bind(this.sidePanel),
      replaceSidePanel: this.sidePanel.replace.bind(this.sidePanel),
      toggleSidePanel: this.sidePanel.toggle.bind(this.sidePanel),
      clipboard: this.env.clipboard || instantiateClipboard(),
      startCellEdition: (content?: string) =>
        this.composerFocusStore.focusActiveComposer({ content }),
      isMobile: isMobileOS,
    } satisfies Partial<SpreadsheetChildEnv>);

    this.notificationPlugin.updateNotificationCallbacks({ ...this.props });

    useLayoutEffect(() => {
      /**
       * Only refocus the grid if the active element is not a child of the spreadsheet
       * (i.e. activeElement is outside of the spreadsheetRef component)
       * and spreadsheet is a child of that element. Anything else means that the focus
       * is on an element that needs to keep it.
       */
      const el = this.spreadsheetRef();
      if (el && !el.contains(document.activeElement) && document.activeElement?.contains(el)) {
        this.focusGrid();
      }
    });

    useListener(window, "resize", () => render(this, true));
    // For some reason, the wheel event is not properly registered inside templates
    // in Chromium-based browsers based on chromium 125
    // This hack ensures the event declared in the template is properly registered/working
    useListener(document.body, "wheel", () => {});
    useListener(
      window,
      "keydown",
      async (event: KeyboardEvent) => {
        const keyDownString = keyboardEventToShortcutString(event);
        if (keyDownString === "Ctrl+P") {
          this.printPlugin.start();
          event.stopPropagation();
          event.preventDefault();
        }
      },
      { capture: true }
    );

    onWillUpdateProps((nextProps: PropsOf<Spreadsheet>) => {
      if (nextProps.model !== this.props.model) {
        throw new Error("Changing the props model is not supported at the moment.");
      }
      if (
        nextProps.notifyUser !== this.props.notifyUser ||
        nextProps.askConfirmation !== this.props.askConfirmation ||
        nextProps.raiseError !== this.props.raiseError
      ) {
        this.notificationPlugin.updateNotificationCallbacks({ ...nextProps });
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      this.sidePanel.changeSpreadsheetWidth(this.spreadsheetRect.width);
    });
    useEffect(() => {
      const el = this.spreadsheetRef();
      if (!el) {
        return;
      }
      resizeObserver.observe(el);
      return () => resizeObserver.disconnect();
    });

    const batchedRender = batched(() => render(this, true));
    onMounted(() => {
      this.bindModelEvents();
      this.checkViewportSize();
      stores.on("store-updated", this, batchedRender);
    });
    onWillUnmount(() => {
      this.unbindModelEvents();
      stores.off("store-updated", this);
      unregisterChartJsExtensions();
    });
    onPatched(() => {
      this.checkViewportSize();
    });
  }

  private bindModelEvents() {
    this.model().on("update", this, () => render(this, true));
    this.model().on("command-rejected", this, ({ result }) => {
      if (result.isCancelledBecause(CommandResult.SheetLocked)) {
        this.notificationPlugin.notifyUser({
          type: "info",
          text: _t("This sheet is locked and cannot be modified. Please unlock it first."),
          sticky: false,
        });
      }
    });

    this.model().on("notify-ui", this, (notification: InformationNotification) =>
      this.notificationPlugin.notifyUser(notification)
    );
    this.model().on("raise-error-ui", this, ({ text }) => this.notificationPlugin.raiseError(text));
  }

  private unbindModelEvents() {
    this.model().off("update", this);
    this.model().off("command-rejected", this);
    this.model().off("notify-ui", this);
    this.model().off("raise-error-ui", this);
  }

  private checkViewportSize() {
    const { xRatio, yRatio } = this.viewStore.viewports.getFrozenSheetViewRatio(
      this.viewStore.displayedSheetId
    );

    if (!isFinite(xRatio) || !isFinite(yRatio)) {
      // before mounting, the ratios can be NaN or Infinity if the viewport size is 0
      return;
    }

    if (yRatio > MAXIMAL_FREEZABLE_RATIO || xRatio > MAXIMAL_FREEZABLE_RATIO) {
      if (this.isViewportTooSmall) {
        return;
      }
      this.notificationPlugin.notifyUser({
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
    return this.viewStore.sheetViewDimension.height;
  }

  get gridContainerStyle(): string {
    const gridColSize = GROUP_LAYER_WIDTH * this.rowLayers.length;
    const gridRowSize = GROUP_LAYER_WIDTH * this.colLayers.length;
    return cssPropertiesToCss({
      "grid-template-columns": `${gridColSize ? gridColSize + 2 : 0}px auto`, // +2: margins
      "grid-template-rows": `${gridRowSize ? gridRowSize + 2 : 0}px auto`,
      zoom: this.zoomStore.cssZoom,
    });
  }

  get rowLayers(): HeaderGroup[][] {
    const sheetId = this.model().getters.getActiveSheetId();
    return this.model().getters.getVisibleGroupLayers(sheetId, "ROW");
  }

  get colLayers(): HeaderGroup[][] {
    const sheetId = this.model().getters.getActiveSheetId();
    return this.model().getters.getVisibleGroupLayers(sheetId, "COL");
  }

  getGridSize() {
    const el = this.spreadsheetRef();
    if (!el) {
      return { width: 0, height: 0 };
    }

    const zoom = this.zoomStore.zoomLevel;
    const scrollbarWidth = this.zoomStore.scrollBarWidth;

    const getHeight = (s: string) =>
      (el.querySelector(s) && zoomCorrectedElementRect(el.querySelector(s)!, zoom).height) || 0;
    const getWidth = (s: string) =>
      (el.querySelector(s) && zoomCorrectedElementRect(el.querySelector(s)!, zoom).width) || 0;

    const rect = el.getBoundingClientRect();
    const topBarHeight = getHeight(".o-spreadsheet-topbar-wrapper");
    const bottomBarHeight = getHeight(".o-spreadsheet-bottombar-wrapper");
    const colGroupHeight = getHeight(".o-column-groups");
    const gridWidth = getWidth(".o-grid");

    const gridHeight = rect.height - colGroupHeight - topBarHeight - bottomBarHeight;

    return {
      width: Math.max(gridWidth / zoom - scrollbarWidth, 0),
      height: Math.max(gridHeight / zoom - scrollbarWidth, 0),
    };
  }

  getSpreadSheetClasses() {
    return [
      this.env.isSmall ? "o-spreadsheet-mobile" : "",
      this.model().getters.isDarkMode() ? "dark" : "",
    ].join(" ");
  }

  get colorScheme(): ColorThemeName {
    if (this.printPlugin.printModeEnabled()) {
      // We want to have the canvas/charts (the model) in light mode when printing, but the UI can be in dark mode
      return this.printPlugin.colorThemeBeforePrint;
    }
    return this.model().getters.isDarkMode() ? "dark" : "light";
  }
}
