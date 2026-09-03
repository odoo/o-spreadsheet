import { Action } from "../actions/action";
import {
  getCarouselMenuActions,
  getChartMenuActions,
  getImageMenuActions,
} from "../actions/figure_menu_actions";
import { CarouselFigure } from "../components/figures/figure_carousel/figure_carousel";
import { ChartFigure } from "../components/figures/figure_chart/figure_chart";
import { ImageFigure } from "../components/figures/figure_image/figure_image";
import { Getters } from "../types/getters";
import { UID } from "../types/misc";
import { SpreadsheetActionEnv } from "../types/spreadsheet_env";
import { Registry } from "./registry";

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
  menuBuilder: (figureId: UID, env: SpreadsheetActionEnv) => Action[];
  isThemeDependant: boolean;
  SidePanelComponent?: string;
  keepRatio?: boolean;
  minFigSize: number;
  borderWidth: (getters: Getters) => number;
  hasShadow: (getters: Getters) => boolean;
  isRounded: (getters: Getters) => boolean;
}

export const figureRegistry = new Registry<FigureContent>();
figureRegistry.add("chart", {
  Component: ChartFigure,
  SidePanelComponent: "ChartPanel",
  menuBuilder: getChartMenuActions,
  minFigSize: 80,
  borderWidth: (getters) => (getters.isDashboard() ? 0 : 1),
  hasShadow: (getters) => getters.isDashboard(),
  isRounded: (getters) => getters.isDashboard(),
  isThemeDependant: true,
});
figureRegistry.add("image", {
  Component: ImageFigure,
  keepRatio: true,
  minFigSize: 20,
  borderWidth: () => 0,
  hasShadow: () => false,
  isRounded: () => false,
  menuBuilder: getImageMenuActions,
  isThemeDependant: false,
});
figureRegistry.add("carousel", {
  Component: CarouselFigure,
  menuBuilder: getCarouselMenuActions,
  minFigSize: 80,
  borderWidth: (getters) => (getters.isDashboard() ? 0 : 1),
  hasShadow: (getters) => getters.isDashboard(),
  isRounded: (getters) => getters.isDashboard(),
  isThemeDependant: true,
});
