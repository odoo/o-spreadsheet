import { Action, ActionSpec, createActions } from "../actions/action";
import { ChartFigure } from "../components/figures/figure_chart/figure_chart";
import { ImageFigure } from "../components/figures/figure_image/figure_image";
import { chartToImageBlob } from "../helpers/figures/charts";
import { getMaxFigureSize } from "../helpers/figures/figure/figure";
import { _t } from "../translation";
import { ClipboardMIMEType, SpreadsheetChildEnv, UID } from "../types";
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
      const type = env.model.getters.getChartType(figureId);
      const figureSheetId = env.model.getters.getFigureSheetId(figureId)!;
      const figure = env.model.getters.getFigure(figureSheetId, figureId)!;
      const runtime = env.model.getters.getChartRuntime(figureId);
      const blob = await chartToImageBlob(runtime, figure, type)!;
      if (blob) {
        const file = new File([blob], "image/png", { type: "image/png" });
        console.log(file.type);
        await env.clipboard.write({
          //@ts-ignore
          [ClipboardMIMEType.Png]: blob, //new ClipboardItem({ [file.type]: file }),
        });
      }
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
      await env.clipboard.write(env.model.getters.getClipboardContent());
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
