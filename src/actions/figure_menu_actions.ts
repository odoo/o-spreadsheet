import { UID } from "..";
import { downloadFile } from "../components/helpers/dom_helpers";
import { chartToImageFile, chartToImageUrl } from "../helpers/figures/charts";
import { getMaxFigureSize } from "../helpers/figures/figure/figure";
import { _t } from "../translation";
import { SpreadsheetChildEnv } from "../types";
import { xmlEscape } from "../xlsx/helpers/xml_helpers";
import { Action, ActionSpec, createActions } from "./action";

export function getChartMenuActions(figureId: UID, env: SpreadsheetChildEnv): Action[] {
  const menuItemSpecs: ActionSpec[] = [
    {
      id: "edit",
      name: _t("Edit"),
      sequence: 1,
      execute: () => {
        env.model.dispatch("SELECT_FIGURE", { figureId });
        env.openSidePanel("ChartPanel");
      },
      icon: "o-spreadsheet-Icon.EDIT",
      isEnabled: (env) => !env.isSmall,
    },
    getCopyMenuItem(figureId, env),
    getCutMenuItem(figureId, env),
    {
      id: "copy_as_image",
      name: _t("Copy as image"),
      icon: "o-spreadsheet-Icon.COPY_AS_IMAGE",
      sequence: 4,
      execute: async () => {
        const figureSheetId = env.model.getters.getFigureSheetId(figureId)!;
        const figure = env.model.getters.getFigure(figureSheetId, figureId)!;
        const chartType = env.model.getters.getChartType(figureId);
        const runtime = env.model.getters.getChartRuntime(figureId);
        const imageUrl = chartToImageUrl(runtime, figure, chartType)!;
        const innerHTML = `<img src="${xmlEscape(imageUrl)}" />`;
        const blob = await chartToImageFile(runtime, figure, chartType)!;

        env.clipboard.write({
          "text/html": innerHTML,
          "image/png": blob,
        });
        env.notifyUser({ sticky: false, type: "success", text: _t("Chart copied to clipboard") });
      },
      isReadonlyAllowed: true,
    },
    {
      id: "download",
      name: _t("Download"),
      icon: "o-spreadsheet-Icon.DOWNLOAD",
      sequence: 6,
      execute: async () => {
        const figureSheetId = env.model.getters.getFigureSheetId(figureId)!;
        const figure = env.model.getters.getFigure(figureSheetId, figureId)!;
        const chartType = env.model.getters.getChartType(figureId);
        const runtime = env.model.getters.getChartRuntime(figureId);
        const url = chartToImageUrl(runtime, figure, chartType)!;
        downloadFile(url, "chart");
      },
      isReadonlyAllowed: true,
    },
    getDeleteMenuItem(figureId, env),
  ];
  return createActions(menuItemSpecs).filter((action) =>
    env.model.getters.isReadonly() ? action.isReadonlyAllowed : true
  );
}

export function getImageMenuActions(figureId: UID, env: SpreadsheetChildEnv): Action[] {
  const menuItemSpecs: ActionSpec[] = [
    getCopyMenuItem(figureId, env, _t("Image copied to clipboard")),
    getCutMenuItem(figureId, env),
    {
      id: "reset_size",
      name: _t("Reset size"),
      sequence: 4,
      execute: async () => {
        const sheetId = env.model.getters.getActiveSheetId();
        const figure = env.model.getters.getFigure(sheetId, figureId);
        if (!figure) {
          return;
        }
        const imagePath = env.model.getters.getImagePath(figureId);
        const size =
          env.model.getters.getImageSize(figureId) ??
          (await env.imageProvider?.getImageOriginalSize(imagePath));
        if (!env.model.getters.getImageSize(figureId)) {
          const image = env.model.getters.getImage(figureId);
          image.size = size;
        }
        const { col, row } = figure;
        const { height, width } = getMaxFigureSize(env.model.getters, size);
        env.model.dispatch("UPDATE_FIGURE", {
          sheetId,
          figureId,
          height,
          width,
          col,
          row,
        });
      },
      icon: "o-spreadsheet-Icon.REFRESH",
    },
    {
      id: "download",
      name: _t("Download"),
      sequence: 6,
      execute: async () => {
        env.model.dispatch("SELECT_FIGURE", { figureId });
        const path = env.model.getters.getImagePath(figureId);
        downloadFile(path, "image");
      },
      icon: "o-spreadsheet-Icon.DOWNLOAD",
    },
    getDeleteMenuItem(figureId, env),
  ];
  return createActions(menuItemSpecs);
}

function getCopyMenuItem(
  figureId: UID,
  env: SpreadsheetChildEnv,
  copiedNotificationMessage?: string
): ActionSpec {
  return {
    id: "copy",
    name: _t("Copy"),
    sequence: 2,
    description: "Ctrl+C",
    execute: async () => {
      env.model.dispatch("SELECT_FIGURE", { figureId });
      env.model.dispatch("COPY");
      const osClipboardContent = await env.model.getters.getClipboardTextAndImageContent();
      await env.clipboard.write(osClipboardContent);
      if (copiedNotificationMessage) {
        env.notifyUser({ sticky: false, type: "success", text: copiedNotificationMessage });
      }
    },
    icon: "o-spreadsheet-Icon.CLIPBOARD",
  };
}

function getCutMenuItem(figureId: UID, env: SpreadsheetChildEnv): ActionSpec {
  return {
    id: "cut",
    name: _t("Cut"),
    sequence: 3,
    description: "Ctrl+X",
    execute: async () => {
      env.model.dispatch("SELECT_FIGURE", { figureId });
      env.model.dispatch("CUT");
      await env.clipboard.write(await env.model.getters.getClipboardTextAndImageContent());
    },
    icon: "o-spreadsheet-Icon.CUT",
  };
}

function getDeleteMenuItem(figureId: UID, env: SpreadsheetChildEnv): ActionSpec {
  return {
    id: "delete",
    name: _t("Delete"),
    sequence: 10,
    execute: () => {
      env.model.dispatch("DELETE_FIGURE", {
        sheetId: env.model.getters.getActiveSheetId(),
        figureId,
      });
    },
    icon: "o-spreadsheet-Icon.TRASH",
  };
}
