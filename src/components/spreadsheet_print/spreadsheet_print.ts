import { computed, PluginInstance, providePlugins, signal, usePlugin } from "@odoo/owl";
import { PrintModePlugin } from "../../owl_plugins/print_mode_owl_plugin";
import { cssPropertiesToCss } from "../helpers/css";
import { OSComponent } from "../os_component";
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
  SpreadsheetPrintPlugin,
} from "./spreadsheet_print_owl_plugin";

export class SpreadsheetPrint extends OSComponent {
  static template = "o-spreadsheet-SpreadsheetPrint";
  static components = { StandaloneGridCanvas, Section, Select, BadgeSelection, Checkbox };

  printPlugin!: PluginInstance<typeof SpreadsheetPrintPlugin>;
  printIframe!: PrintIframe;
  printModePlugin!: PluginInstance<typeof PrintModePlugin>;

  private iframeRef = signal<HTMLIFrameElement | null>(null);

  setup() {
    providePlugins([SpreadsheetPrintPlugin]);
    this.printPlugin = usePlugin(SpreadsheetPrintPlugin);
    this.printModePlugin = usePlugin(PrintModePlugin);
    this.printIframe = usePrintIframe({
      iframeRef: this.iframeRef,
      pageCount: computed(() => this.printPlugin.printPages().length),
      pageStyle: computed((): string => {
        const { width, height } = this.printPlugin.pageDimensionsInPixels();
        return cssPropertiesToCss({
          width: `${width}px`,
          height: `${height}px`,
          padding: `${this.printPlugin.printMargin}px`,
        });
      }),
      pageRule: computed((): string => {
        const size = `${this.printPlugin.pageLayout()} ${this.printPlugin.orientation()}`;
        return `@page { size: ${size}; margin: ${this.printPlugin.printMargin}px; }`;
      }),
    });
  }

  onLayoutChange(value: PrintPageLayout) {
    this.printPlugin.changePrintLayout(value);
  }

  onPrintSelectionChange(value: PrintSelection) {
    this.printPlugin.changePrintSelection(value);
  }

  onPrintScaleChange(value: PrintScale) {
    this.printPlugin.changePrintScale(value);
  }

  setGridLinesVisibility(value: boolean) {
    this.printPlugin.setGridLinesVisibility(!value);
  }

  changeOrientation(value: Orientation) {
    this.printPlugin.changePrintOrientation(value);
  }

  onPrint() {
    this.printIframe.print();
    this.printModePlugin.stop();
  }
}
