import { proxy, useProps } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { performanceRegistry } from "../../../registries/performance_registry";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";
import { BadgeSelection } from "../components/badge_selection/badge_selection";
import { Section } from "../components/section/section";
import { FormulasPerformance } from "./formulas_performance";

export class PerfProfilePanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PerfProfilePanel";
  static components = { Section, BadgeSelection, FormulasPerformance };

  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  private state = proxy({
    lastProfiledTime: 0,
    currentPerfSection: "formulas",
  });

  get perfSections() {
    const items = Object.keys(performanceRegistry.content).map((item) => {
      const itemContent = performanceRegistry.get(item);
      return { value: item, label: itemContent?.title };
    });
    return items;
  }

  get perfSectionComponent() {
    const item = performanceRegistry.get(this.state.currentPerfSection);
    return item?.Body;
  }

  onPerfSectionChange(perfSection: string) {
    this.state.currentPerfSection = perfSection;
  }

  startProfiling(event: MouseEvent) {
    if (event.timeStamp - this.state.lastProfiledTime < 50) {
      return;
    }
    performanceRegistry.get(this.state.currentPerfSection).compute(this.env);
    this.state.lastProfiledTime = performance.now(); // has the same reference time as event.timeStamp. Don't use Date.now().
  }
}
