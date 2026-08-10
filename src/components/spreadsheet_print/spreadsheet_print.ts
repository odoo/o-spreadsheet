import { signal, useProps } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { useLocalStore } from "../../store_engine/store_hooks";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { Store } from "../../types/store_engine";
import { cssPropertiesToCss } from "../helpers/css";
import { types } from "../props_validation";
import { Select } from "../select/select";
import { BadgeSelection } from "../side_panel/components/badge_selection/badge_selection";
import { Checkbox } from "../side_panel/components/checkbox/checkbox";
import { Section } from "../side_panel/components/section/section";
import { StandaloneGridCanvas } from "../standalone_grid_canvas/standalone_grid_canvas";
import { PrintIframe, usePrintIframe } from "./print_iframe";
import {
  Orientation,
  PrintPageLayout,
  PrintScale,
  PrintSelection,
  SpreadsheetPrintStore,
} from "./spreadsheet_print_store";

export class SpreadsheetPrint extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetPrint";
  protected props = useProps({
    onExitPrintMode: types.function(),
  });
  static components = { StandaloneGridCanvas, Section, Select, BadgeSelection, Checkbox };

  printStore!: Store<SpreadsheetPrintStore>;
  printIframe!: PrintIframe;

  private iframeRef = signal<HTMLIFrameElement | null>(null);

  setup() {
    this.printStore = useLocalStore(SpreadsheetPrintStore);
    this.printIframe = usePrintIframe({
      iframeRef: this.iframeRef,
      pageCount: () => this.printStore.printPages.length,
      pageStyle: () => this.pageStyle,
      pageRule: () => this.pageRule,
    });
  }

  get pageRule(): string {
    const size = `${this.printStore.pageLayout} ${this.printStore.orientation}`;
    return `@page { size: ${size}; margin: ${this.printStore.printMargin}px; }`;
  }

  get pageStyle(): string {
    const { width, height } = this.printStore.pageDimensionsInPixels;
    return cssPropertiesToCss({
      width: `${width}px`,
      height: `${height}px`,
      padding: `${this.printStore.printMargin}px`,
    });
  }

  onLayoutChange(value: PrintPageLayout) {
    this.printStore.changePrintLayout(value);
  }

  onPrintSelectionChange(value: PrintSelection) {
    this.printStore.changePrintSelection(value);
  }

  onPrintScaleChange(value: PrintScale) {
    this.printStore.changePrintScale(value);
  }

  setGridLinesVisibility(value: boolean) {
    this.printStore.setGridLinesVisibility(!value);
  }

  changeOrientation(value: Orientation) {
    this.printStore.changePrintOrientation(value);
  }

  onPrint() {
    this.printIframe.print();
    this.props.onExitPrintMode();
  }
}
