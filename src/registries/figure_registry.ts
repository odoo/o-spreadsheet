import { ChartFigure } from "../components/figures/chart";
import { Registry } from "../registry";

//------------------------------------------------------------------------------
// Figure Registry
//------------------------------------------------------------------------------

/**
 * This registry is intended to map a type of figure (tag) to a class of
 * component, that will be used in the UI to represent the figure.
 *
 * The most important type of figure will be the Chart
 */

export interface FigureContent {
  Component: any;
  SidePanelComponent?: string;
}

export const figureRegistry = new Registry<FigureContent>();

// figureRegistry.add("ConditionalFormatting", {
//   title: "Conditional formatting",
//   Body: ConditionalFormattingPanel,
// });
//

figureRegistry.add("chart", { Component: ChartFigure, SidePanelComponent: "ChartPanel" });
