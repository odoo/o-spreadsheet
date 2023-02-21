import { ChartFigure } from "../components/figures/figure_chart/figure_chart";
import { ImageFigure } from "../components/figures/figure_image/figure_image";
import { getMaxFigureSize } from "../helpers/figures/figure/figure";
import { _lt } from "../translation";
import { SpreadsheetChildEnv, UID } from "../types";
import { createMenu, MenuItem, MenuItemSpec } from "./menu_items_registry";
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
  menuBuilder: (figureId: UID, onFigureDeleted: () => void, env: SpreadsheetChildEnv) => MenuItem[];
  SidePanelComponent?: string;
  keepRatio?: boolean;
  minFigSize?: number;
  borderWidth?: number;
}

export const figureRegistry = new Registry<FigureContent>();
figureRegistry.add("chart", {
  Component: ChartFigure,
  SidePanelComponent: "ChartPanel",
  menuBuilder: getChartMenu,
});
figureRegistry.add("image", {
  Component: ImageFigure,
  keepRatio: true,
  minFigSize: 20,
  borderWidth: 0,
  menuBuilder: getImageMenuRegistry,
});

function getChartMenu(
  figureId: UID,
  onFigureDeleted: () => void,
  env: SpreadsheetChildEnv
): MenuItem[] {
  const menuItemSpecs: MenuItemSpec[] = [
    {
      id: "edit",
      name: _lt("Edit"),
      sequence: 1,
      action: () => {
        env.model.dispatch("SELECT_FIGURE", { id: figureId });
        env.openSidePanel("ChartPanel");
      },
    },
    getCopyMenuItem(figureId, env),
    getCutMenuItem(figureId, env),
    getDeleteMenuItem(figureId, onFigureDeleted, env),
  ];
  return createMenu(menuItemSpecs);
}

function getImageMenuRegistry(
  figureId: UID,
  onFigureDeleted: () => void,
  env: SpreadsheetChildEnv
): MenuItem[] {
  const menuItemSpecs: MenuItemSpec[] = [
    getCopyMenuItem(figureId, env),
    getCutMenuItem(figureId, env),
    {
      id: "reset_size",
      name: _lt("Reset size"),
      sequence: 4,
      action: () => {
        const size = env.model.getters.getImageSize(figureId);
        const { height, width } = getMaxFigureSize(env.model.getters, size);
        env.model.dispatch("UPDATE_FIGURE", {
          sheetId: env.model.getters.getActiveSheetId(),
          id: figureId,
          height,
          width,
        });
      },
    },
    getDeleteMenuItem(figureId, onFigureDeleted, env),
  ];
  return createMenu(menuItemSpecs);
}

function getCopyMenuItem(figureId: UID, env: SpreadsheetChildEnv): MenuItemSpec {
  return {
    id: "copy",
    name: _lt("Copy"),
    sequence: 2,
    description: "Ctrl+C",
    action: async () => {
      env.model.dispatch("SELECT_FIGURE", { id: figureId });
      env.model.dispatch("COPY");
      await env.clipboard.write(env.model.getters.getClipboardContent());
    },
  };
}

function getCutMenuItem(figureId: UID, env: SpreadsheetChildEnv): MenuItemSpec {
  return {
    id: "cut",
    name: _lt("Cut"),
    sequence: 3,
    description: "Ctrl+X",
    action: async () => {
      env.model.dispatch("SELECT_FIGURE", { id: figureId });
      env.model.dispatch("CUT");
      await env.clipboard.write(env.model.getters.getClipboardContent());
    },
  };
}

function getDeleteMenuItem(
  figureId: UID,
  onFigureDeleted: () => void,
  env: SpreadsheetChildEnv
): MenuItemSpec {
  return {
    id: "delete",
    name: _lt("Delete"),
    sequence: 10,
    action: () => {
      env.model.dispatch("DELETE_FIGURE", {
        sheetId: env.model.getters.getActiveSheetId(),
        id: figureId,
      });
      onFigureDeleted();
    },
  };
}
