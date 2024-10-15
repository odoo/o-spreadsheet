import { Action, ActionSpec, createActions } from "../actions/action";
import { ChartFigure } from "../components/figures/figure_chart/figure_chart";
import { ImageFigure } from "../components/figures/figure_image/figure_image";
import { getMaxFigureSize } from "../helpers/figures/figure/figure";
import { _t } from "../translation";
import { SpreadsheetChildEnv, UID } from "../types";
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
  menuBuilder: (figureId: UID, onFigureDeleted: () => void, env: SpreadsheetChildEnv) => Action[];
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
): Action[] {
  const menuItemSpecs: ActionSpec[] = [
    {
      id: "edit",
      name: _t("Edit"),
      sequence: 1,
      execute: () => {
        env.model.dispatch("SELECT_FIGURE", { id: figureId });
        env.openSidePanel("ChartPanel");
      },
      icon: "o-spreadsheet-Icon.EDIT",
    },
    getCopyMenuItem(figureId, env),
    getCutMenuItem(figureId, env),
    getDeleteMenuItem(figureId, onFigureDeleted, env),
  ];
  return createActions(menuItemSpecs);
}

function getImageMenuRegistry(
  figureId: UID,
  onFigureDeleted: () => void,
  env: SpreadsheetChildEnv
): Action[] {
  const menuItemSpecs: ActionSpec[] = [
    getCopyMenuItem(figureId, env),
    getCutMenuItem(figureId, env),
    {
      id: "reset_size",
      name: _t("Reset size"),
      sequence: 4,
      execute: async () => {
        const imagePath = env.model.getters.getImagePath(figureId);
        const size =
          env.model.getters.getImageSize(figureId) ??
          (await env.imageProvider?.getImageOriginalSize(imagePath));
        if (!env.model.getters.getImageSize(figureId)) {
          const image = env.model.getters.getImage(figureId);
          image.size = size;
        }
        const { height, width } = getMaxFigureSize(env.model.getters, size);
        env.model.dispatch("UPDATE_FIGURE", {
          sheetId: env.model.getters.getActiveSheetId(),
          id: figureId,
          height,
          width,
        });
      },
      icon: "o-spreadsheet-Icon.REFRESH",
    },
    getDeleteMenuItem(figureId, onFigureDeleted, env),
  ];
  return createActions(menuItemSpecs);
}

function getCopyMenuItem(figureId: UID, env: SpreadsheetChildEnv): ActionSpec {
  return {
    id: "copy",
    name: _t("Copy"),
    sequence: 2,
    description: "Ctrl+C",
    execute: async () => {
      env.model.dispatch("SELECT_FIGURE", { id: figureId });
      env.model.dispatch("COPY");
      const osClipboardContent = await env.model.getters.getOsClipboardContentAsync();
      await env.clipboard.write(osClipboardContent);
    },
    icon: "o-spreadsheet-Icon.COPY",
  };
}

function getCutMenuItem(figureId: UID, env: SpreadsheetChildEnv): ActionSpec {
  return {
    id: "cut",
    name: _t("Cut"),
    sequence: 3,
    description: "Ctrl+X",
    execute: async () => {
      env.model.dispatch("SELECT_FIGURE", { id: figureId });
      env.model.dispatch("CUT");
      await env.clipboard.write(await env.model.getters.getOsClipboardContentAsync());
    },
    icon: "o-spreadsheet-Icon.CUT",
  };
}

function getDeleteMenuItem(
  figureId: UID,
  onFigureDeleted: () => void,
  env: SpreadsheetChildEnv
): ActionSpec {
  return {
    id: "delete",
    name: _t("Delete"),
    sequence: 10,
    execute: () => {
      env.model.dispatch("DELETE_FIGURE", {
        sheetId: env.model.getters.getActiveSheetId(),
        id: figureId,
      });
      onFigureDeleted();
    },
    icon: "o-spreadsheet-Icon.TRASH",
  };
}
