import { Plugin, signal, usePlugin } from "@odoo/owl";
import { ColorThemeName } from "../types/rendering";
import { ModelPlugin } from "./model_owl_plugin";

export class PrintPlugin extends Plugin {
  modelPlugin = usePlugin(ModelPlugin);
  printModeEnabled = signal(false);
  colorThemeBeforePrint: ColorThemeName = "light";

  start() {
    if (!this.printModeEnabled()) {
      this.colorThemeBeforePrint = this.modelPlugin.model().getters.isDarkMode() ? "dark" : "light";
      this.modelPlugin.model().dispatch("UPDATE_COLOR_SCHEME", { colorScheme: "light" });
      this.printModeEnabled.set(true);
    }
  }

  stop() {
    if (this.printModeEnabled()) {
      this.modelPlugin
        .model()
        .dispatch("UPDATE_COLOR_SCHEME", { colorScheme: this.colorThemeBeforePrint });
      this.printModeEnabled.set(false);
    }
  }
}
