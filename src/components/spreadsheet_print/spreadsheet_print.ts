import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUnmount, useExternalListener } from "@odoo/owl";
import { Store, useLocalStore } from "../../store_engine";
import { cssPropertiesToCss } from "../helpers";
import { Select } from "../select/select";
import { BadgeSelection } from "../side_panel/components/badge_selection/badge_selection";
import { Checkbox } from "../side_panel/components/checkbox/checkbox";
import { Section } from "../side_panel/components/section/section";
import { StandaloneGridCanvas } from "../standalone_grid_canvas/standalone_grid_canvas";
import {
  Orientation,
  PrintPageLayout,
  PrintScale,
  PrintSelection,
  SpreadsheetPrintStore,
} from "./spreadsheet_print_store";

interface Props {
  onExitPrintMode: () => void;
}

export class SpreadsheetPrint extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetPrint";
  static props = { onExitPrintMode: Function };
  static components = { StandaloneGridCanvas, Section, Select, BadgeSelection, Checkbox };

  printStore!: Store<SpreadsheetPrintStore>;

  setup() {
    this.printStore = useLocalStore(SpreadsheetPrintStore);
    let styleElement: HTMLStyleElement | null = null;
    useExternalListener(window, "beforeprint", () => {
      styleElement = document.createElement("style");
      styleElement.id = "o-spreadsheet-print-style";
      const size = `${this.printStore.pageLayout} ${this.printStore.orientation}`;
      styleElement.textContent = `@media print { @page { size: ${size}; margin: ${this.printStore.printMargin}px;}}`;
      document.head.appendChild(styleElement);
    });
    const removePrintStyle = () => {
      if (styleElement) {
        document.head.removeChild(styleElement);
        styleElement = null;
      }
    };
    useExternalListener(window, "afterprint", () => removePrintStyle());
    onWillUnmount(() => removePrintStyle());
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
    window.print();
    this.props.onExitPrintMode();
  }
}
