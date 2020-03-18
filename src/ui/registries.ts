import { Registry } from "../registry";
import { ConditionalFormattingPanel } from "./side_panel/conditional_formatting";

interface SidePanelContent {
  title: string;
  Body: any;
  Footer?: any;
}

export const sidePanelRegistry = new Registry<SidePanelContent>();

sidePanelRegistry.add("ConditionalFormatting", {
  title: "Conditional Formatting",
  Body: ConditionalFormattingPanel
});
