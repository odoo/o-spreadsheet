import { SidePanelRegistry } from "./registry";
import { ConditionalFormattingPanel } from "./conditional_formatting";

export function fillPanelRegistry() {
  SidePanelRegistry.add(
    "ConditionalFormattingPanel",
    "Conditional formatting",
    ConditionalFormattingPanel
  );
}
