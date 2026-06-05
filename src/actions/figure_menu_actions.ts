import { Model, UID } from "..";
import { downloadFile } from "../components/helpers/dom_helpers";
import { chartToImageFile, chartToImageUrl } from "../helpers/figures/charts/chart_ui_common";
import { getMaxFigureSize } from "../helpers/figures/figure/figure";
import { deepEquals } from "../helpers/misc";
import { _t } from "../translation";
import { Action, ActionSpec, createActions } from "./action";

export function getChartMenuActions(figureId: UID, model: Model): Action[] {
  const chartId = model.getters.getChartIdFromFigureId(figureId);
  if (!chartId) {
    return [];
  }
  const menuItemSpecs: ActionSpec[] = [
    getMergeCarouselMenuItem(figureId),
    {
      id: "edit",
      name: _t("Edit"),
      execute: (model, env) => {
        model.dispatch("SELECT_FIGURE", { figureId });
        env.openSidePanel("ChartPanel");
      },
      icon: "o-spreadsheet-Icon.EDIT",
      isEnabled: (model, env) => !env.isSmall,
    },
    getCopyMenuItem(figureId),
    getCutMenuItem(figureId),
    getCopyAsImageMenuItem(figureId),
    getDownloadChartMenuItem(figureId),
    getDeleteMenuItem(figureId),
  ];
  return createActions(menuItemSpecs).filter((action) =>
    model.getters.isReadonly() ? action.isReadonlyAllowed : true
  );
}

export function getImageMenuActions(figureId: UID): Action[] {
  const menuItemSpecs: ActionSpec[] = [
    getCopyMenuItem(figureId, _t("Image copied to clipboard")),
    getCutMenuItem(figureId),
    {
      id: "reset_size",
      name: _t("Reset size"),
      execute: async (model, env) => {
        const sheetId = model.getters.getActiveSheetId();
        const figure = model.getters.getFigure(sheetId, figureId);
        if (!figure) {
          return;
        }
        const imagePath = model.getters.getImagePath(figureId);
        const size =
          model.getters.getImageSize(figureId) ??
          (await env.imageProvider?.getImageOriginalSize(imagePath));
        if (!model.getters.getImageSize(figureId)) {
          const image = model.getters.getImage(figureId);
          image.size = size;
        }
        const { col, row } = figure;
        const { height, width } = getMaxFigureSize(model.getters, size);
        model.dispatch("UPDATE_FIGURE", {
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
      execute: async (model) => {
        model.dispatch("SELECT_FIGURE", { figureId });
        const path = model.getters.getImagePath(figureId);
        downloadFile(path, "image");
      },
      icon: "o-spreadsheet-Icon.DOWNLOAD",
    },
    getDeleteMenuItem(figureId),
  ];
  return createActions(menuItemSpecs);
}

export function getCarouselMenuActions(figureId: UID, model: Model): Action[] {
  const isChartSelected = (model: Model) =>
    model.getters.getSelectedCarouselItem(figureId)?.type === "chart";
  const menuItemSpecs: ActionSpec[] = [
    {
      id: "edit_carousel",
      name: _t("Edit carousel"),
      execute: (model, env) => {
        model.dispatch("SELECT_FIGURE", { figureId });
        env.openSidePanel("CarouselPanel", { figureId });
      },
      icon: "o-spreadsheet-Icon.EDIT",
      isEnabled: (model, env) => !env.isSmall,
    },
    {
      ...getCopyMenuItem(figureId, _t("Carousel copied to clipboard")),
      name: _t("Copy carousel"),
    },
    { ...getCutMenuItem(figureId), name: _t("Cut carousel") },
    {
      ...getDeleteMenuItem(figureId),
      name: _t("Delete carousel"),
      separator: true,
    },

    {
      id: "edit_chart",
      name: _t("Edit chart"),
      execute: (model, env) => {
        model.dispatch("SELECT_FIGURE", { figureId });
        env.openSidePanel("ChartPanel", {});
      },
      icon: "o-spreadsheet-Icon.EDIT",
      isEnabled: (model, env) => !env.isSmall,
      isVisible: isChartSelected,
    },
    {
      ...getCopyAsImageMenuItem(figureId),
      isVisible: isChartSelected,
      name: _t("Copy chart as image"),
    },
    {
      ...getDownloadChartMenuItem(figureId),
      isVisible: isChartSelected,
      name: _t("Download chart"),
    },
    {
      id: "popout_chart",
      name: _t("Pop out chart"),
      icon: "o-spreadsheet-Icon.EXTERNAL",
      execute: (model) => {
        const selectedItem = model.getters.getSelectedCarouselItem(figureId);
        if (!selectedItem || selectedItem.type !== "chart") {
          return;
        }
        model.dispatch("POPOUT_CHART_FROM_CAROUSEL", {
          carouselId: figureId,
          chartId: selectedItem.chartId,
          sheetId: model.getters.getActiveSheetId(),
        });
      },
      isVisible: isChartSelected,
    },
    {
      id: "delete_carousel_item",
      name: (model) => {
        const item = model.getters.getSelectedCarouselItem(figureId);
        return item?.type === "chart" ? _t("Delete chart") : _t("Delete data view");
      },
      execute: (model) => {
        const item = model.getters.getSelectedCarouselItem(figureId);
        if (!item) {
          return;
        }
        const carousel = model.getters.getCarousel(figureId);
        const items = carousel.items.filter((itm) => !deepEquals(itm, item));
        model.dispatch("UPDATE_CAROUSEL", {
          figureId,
          sheetId: model.getters.getActiveSheetId(),
          definition: { ...carousel, items },
        });
      },
      icon: "o-spreadsheet-Icon.TRASH",
      isVisible: (model) => model.getters.getCarousel(figureId).items.length >= 1,
    },
  ];
  return createActions(menuItemSpecs).filter((action) =>
    model.getters.isReadonly() ? action.isReadonlyAllowed : true
  );
}

function getCopyMenuItem(figureId: UID, copiedNotificationMessage?: string): ActionSpec {
  return {
    id: "copy",
    name: _t("Copy"),
    shortcut: "Ctrl+C",
    execute: async (model, env) => {
      if (!model.getters.getSelectedFigureIds().includes(figureId)) {
        model.dispatch("SELECT_FIGURE", { figureId });
      }
      model.dispatch("COPY");
      const osClipboardContent = await model.getters.getClipboardTextAndImageContent();
      await env.clipboard.write(osClipboardContent);
      if (copiedNotificationMessage) {
        env.notifyUser({ sticky: false, type: "success", text: copiedNotificationMessage });
      }
    },
    icon: "o-spreadsheet-Icon.CLIPBOARD",
    isEnabledOnLockedSheet: true,
  };
}

function getCutMenuItem(figureId: UID): ActionSpec {
  return {
    id: "cut",
    name: _t("Cut"),
    shortcut: "Ctrl+X",
    execute: async (model, env) => {
      if (!model.getters.getSelectedFigureIds().includes(figureId)) {
        model.dispatch("SELECT_FIGURE", { figureId });
      }
      model.dispatch("CUT");
      await env.clipboard.write(await model.getters.getClipboardTextAndImageContent());
    },
    icon: "o-spreadsheet-Icon.CUT",
  };
}

function getCopyAsImageMenuItem(figureId: UID): ActionSpec {
  return {
    id: "copy_as_image",
    name: _t("Copy as image"),
    icon: "o-spreadsheet-Icon.COPY_AS_IMAGE",
    execute: async (model, env) => {
      const figureSheetId = model.getters.getFigureSheetId(figureId)!;
      const figure = model.getters.getFigure(figureSheetId, figureId)!;
      const chartId = model.getters.getChartIdFromFigureId(figureId);
      if (!chartId) {
        return;
      }
      const chartType = model.getters.getChartType(chartId);
      const runtime = model.getters.getChartRuntime(chartId);
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

      await env.clipboard.write({
        "text/html": innerHTML,
        "image/png": blob,
      });
      env.notifyUser({ sticky: false, type: "success", text: _t("Chart copied to clipboard") });
    },
    isVisible: (model) => model.getters.getSelectedFigureIds().length <= 1,
    isReadonlyAllowed: true,
    isEnabledOnLockedSheet: true,
  };
}

function getDownloadChartMenuItem(figureId: UID): ActionSpec {
  return {
    id: "download",
    name: _t("Download"),
    icon: "o-spreadsheet-Icon.DOWNLOAD",
    execute: async (model, env) => {
      const figureSheetId = model.getters.getFigureSheetId(figureId)!;
      const figure = model.getters.getFigure(figureSheetId, figureId)!;
      const chartId = model.getters.getChartIdFromFigureId(figureId);
      if (!chartId) {
        return;
      }
      const chartType = model.getters.getChartType(chartId);
      const runtime = model.getters.getChartRuntime(chartId);
      const url = await chartToImageUrl(runtime, figure, chartType);
      if (!url) {
        return;
      }
      downloadFile(url, "chart");
    },
    isVisible: (model) => model.getters.getSelectedFigureIds().length <= 1,
    isReadonlyAllowed: true,
    isEnabledOnLockedSheet: true,
  };
}

function getDeleteMenuItem(figureId: UID): ActionSpec {
  return {
    id: "delete",
    name: _t("Delete"),
    execute: (model) => {
      const selectedFiguresIds = model.getters.getSelectedFigureIds();
      if (selectedFiguresIds.includes(figureId)) {
        model.dispatch("DELETE_FIGURES", {
          sheetId: model.getters.getActiveSheetId(),
          figureIds: selectedFiguresIds,
        });
      } else {
        model.dispatch("DELETE_FIGURE", {
          sheetId: model.getters.getActiveSheetId(),
          figureId,
        });
      }
    },
    icon: "o-spreadsheet-Icon.TRASH",
  };
}

function getMergeCarouselMenuItem(figureId: UID): ActionSpec {
  return {
    id: "mergeCarousel",
    name: _t("Create carousel"),
    isVisible: (model) => {
      const selectedFiguresIds = model.getters.getSelectedFigureIds();
      if (selectedFiguresIds.length < 2 || !selectedFiguresIds.includes(figureId)) {
        return false;
      }
      const sheetId = model.getters.getActiveSheetId();
      const figures = selectedFiguresIds.map((id) => model.getters.getFigure(sheetId, id));
      return !figures.some((f) => f === undefined || f.tag !== "chart");
    },
    execute: (model) => {
      const sheetId = model.getters.getActiveSheetId();
      const chartFigureIds = model.getters.getSelectedFigureIds();
      model.dispatch("MERGE_CHART_FIGURES_INTO_CAROUSEL", {
        sheetId,
        baseFigureId: figureId,
        chartFigureIds,
      });
    },
    icon: "o-spreadsheet-Icon.CAROUSEL",
  };
}
