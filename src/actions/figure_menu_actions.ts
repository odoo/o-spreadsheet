import { deepEquals } from "@odoo/o-spreadsheet-engine";
import { getMaxFigureSize } from "@odoo/o-spreadsheet-engine/helpers/figures/figure/figure";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { UID } from "..";
import { downloadFile } from "../components/helpers/dom_helpers";
import { chartToImageFile, chartToImageUrl } from "../helpers/figures/charts";
import { Action, ActionSpec, createActions } from "./action";

export function getChartMenuActions(figureId: UID, env: SpreadsheetChildEnv): Action[] {
  const chartId = env.model.getters.getChartIdFromFigureId(figureId);
  if (!chartId) {
    return [];
  }
  const menuItemSpecs: ActionSpec[] = [
    {
      id: "edit",
      name: _t("Edit"),
      execute: () => {
        env.model.dispatch("SELECT_FIGURE", { figureId });
        env.openSidePanel("ChartPanel");
      },
      icon: "o-spreadsheet-Icon.EDIT",
      isEnabled: (env) => !env.isSmall,
    },
    getCopyMenuItem(figureId, env),
    getCutMenuItem(figureId, env),
    getCopyAsImageMenuItem(figureId, env),
    getDownloadChartMenuItem(figureId, env),
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

export function getCarouselMenuActions(figureId: UID, env: SpreadsheetChildEnv): Action[] {
  const isChartSelected = (env: SpreadsheetChildEnv) =>
    env.model.getters.getSelectedCarouselItem(figureId)?.type === "chart";
  const menuItemSpecs: ActionSpec[] = [
    {
      id: "edit_carousel",
      name: _t("Edit carousel"),
      execute: () => {
        env.model.dispatch("SELECT_FIGURE", { figureId });
        env.openSidePanel("CarouselPanel", { figureId });
      },
      icon: "o-spreadsheet-Icon.EDIT",
      isEnabled: (env) => !env.isSmall,
    },
    {
      ...getCopyMenuItem(figureId, env, _t("Carousel copied to clipboard")),
      name: _t("Copy carousel"),
    },
    { ...getCutMenuItem(figureId, env), name: _t("Cut carousel") },
    {
      ...getDeleteMenuItem(figureId, env),
      name: _t("Delete carousel"),
      separator: true,
    },

    {
      id: "edit_chart",
      name: _t("Edit chart"),
      execute: () => {
        env.model.dispatch("SELECT_FIGURE", { figureId });
        env.openSidePanel("ChartPanel", {});
      },
      icon: "o-spreadsheet-Icon.EDIT",
      isEnabled: (env) => !env.isSmall,
      isVisible: isChartSelected,
    },
    {
      ...getCopyAsImageMenuItem(figureId, env),
      isVisible: isChartSelected,
      name: _t("Copy chart as image"),
    },
    {
      ...getDownloadChartMenuItem(figureId, env),
      isVisible: isChartSelected,
      name: _t("Download chart"),
    },
    {
      id: "popout_chart",
      name: _t("Pop out chart"),
      icon: "o-spreadsheet-Icon.EXTERNAL",
      execute: () => {
        const selectedItem = env.model.getters.getSelectedCarouselItem(figureId);
        if (!selectedItem || selectedItem.type !== "chart") {
          return;
        }
        env.model.dispatch("POPOUT_CHART_FROM_CAROUSEL", {
          carouselId: figureId,
          chartId: selectedItem.chartId,
          sheetId: env.model.getters.getActiveSheetId(),
        });
      },
      isVisible: isChartSelected,
    },
    {
      id: "delete_carousel_item",
      name: (env) => {
        const item = env.model.getters.getSelectedCarouselItem(figureId);
        return item?.type === "chart" ? _t("Delete chart") : _t("Delete data view");
      },
      execute: () => {
        const item = env.model.getters.getSelectedCarouselItem(figureId);
        if (!item) {
          return;
        }
        const carousel = env.model.getters.getCarousel(figureId);
        const items = carousel.items.filter((itm) => !deepEquals(itm, item));
        env.model.dispatch("UPDATE_CAROUSEL", {
          figureId,
          sheetId: env.model.getters.getActiveSheetId(),
          definition: { ...carousel, items },
        });
      },
      icon: "o-spreadsheet-Icon.TRASH",
      isVisible: (env) => env.model.getters.getCarousel(figureId).items.length >= 1,
    },
  ];
  return createActions(menuItemSpecs).filter((action) =>
    env.model.getters.isReadonly() ? action.isReadonlyAllowed : true
  );
}

function getCopyMenuItem(
  figureId: UID,
  env: SpreadsheetChildEnv,
  copiedNotificationMessage?: string
): ActionSpec {
  return {
    id: "copy",
    name: _t("Copy"),
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
    description: "Ctrl+X",
    execute: async () => {
      env.model.dispatch("SELECT_FIGURE", { figureId });
      env.model.dispatch("CUT");
      await env.clipboard.write(await env.model.getters.getClipboardTextAndImageContent());
    },
    icon: "o-spreadsheet-Icon.CUT",
  };
}

function getCopyAsImageMenuItem(figureId: UID, env: SpreadsheetChildEnv): ActionSpec {
  return {
    id: "copy_as_image",
    name: _t("Copy as image"),
    icon: "o-spreadsheet-Icon.COPY_AS_IMAGE",
    execute: async () => {
      const figureSheetId = env.model.getters.getFigureSheetId(figureId)!;
      const figure = env.model.getters.getFigure(figureSheetId, figureId)!;
      const chartId = env.model.getters.getChartIdFromFigureId(figureId);
      if (!chartId) {
        return;
      }
      const chartType = env.model.getters.getChartType(chartId);
      const runtime = env.model.getters.getChartRuntime(chartId);
      const blob = await chartToImageFile(runtime, figure, chartType);
      if (!blob) {
        return;
      }

      const image: ArrayBuffer = await new Promise((resolve) => {
        const reader = new FileReader();

        reader.addEventListener("loadend", (e) => {
          const base64data = reader.result;
          resolve(base64data as ArrayBuffer);
        });
        reader.readAsArrayBuffer(blob);
      });
      const imageBase = new Uint8Array(image);
      // @ts-ignore // toBase64 added to Uint8Array in Sept 2025
      const imageBase64 = imageBase.toBase64();

      const innerHTML = `<img src="data:image/png;base64,${imageBase64}" />`;

      env.clipboard.write({
        "text/html": innerHTML,
        "image/png": blob,
      });
      env.notifyUser({ sticky: false, type: "success", text: _t("Chart copied to clipboard") });
    },
    isReadonlyAllowed: true,
  };
}

function getDownloadChartMenuItem(figureId: UID, env: SpreadsheetChildEnv): ActionSpec {
  return {
    id: "download",
    name: _t("Download"),
    icon: "o-spreadsheet-Icon.DOWNLOAD",
    execute: async () => {
      const figureSheetId = env.model.getters.getFigureSheetId(figureId)!;
      const figure = env.model.getters.getFigure(figureSheetId, figureId)!;
      const chartId = env.model.getters.getChartIdFromFigureId(figureId);
      if (!chartId) {
        return;
      }
      const chartType = env.model.getters.getChartType(chartId);
      const runtime = env.model.getters.getChartRuntime(chartId);
      const url = await chartToImageUrl(runtime, figure, chartType);
      if (!url) {
        return;
      }
      downloadFile(url, "chart");
    },
    isReadonlyAllowed: true,
  };
}

function getDeleteMenuItem(figureId: UID, env: SpreadsheetChildEnv): ActionSpec {
  return {
    id: "delete",
    name: _t("Delete"),
    execute: () => {
      env.model.dispatch("DELETE_FIGURE", {
        sheetId: env.model.getters.getActiveSheetId(),
        figureId,
      });
    },
    icon: "o-spreadsheet-Icon.TRASH",
  };
}
