import { CAROUSEL_DEFAULT_CHART_DEFINITION } from "../../helpers/carousel_helpers";
import { SpreadsheetChart } from "../../helpers/figures/chart";
import { deepEquals, insertItemsAtIndex } from "../../helpers/misc";
import { UuidGenerator } from "../../helpers/uuid";
import {
  Command,
  CommandResult,
  DuplicateCarouselChartCommand,
  LocalCommand,
} from "../../types/commands";
import { Carousel, CarouselItem } from "../../types/figure";
import { UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class CarouselUIPlugin extends UIPlugin {
  static getters = [
    "getSelectedCarouselItem",
    "getChartFromFigureId",
    "getChartIdFromFigureId",
    "isDataViewActive",
  ] as const;

  carouselStates: Record<UID, string | undefined> = {};

  allowDispatch(cmd: LocalCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "ADD_FIGURE_CHART_TO_CAROUSEL":
        if (
          !this.getters.doesCarouselExist(cmd.carouselFigureId) ||
          this.getters.getFigure(cmd.sheetId, cmd.chartFigureId)?.tag !== "chart"
        ) {
          return CommandResult.InvalidFigureId;
        }
        return CommandResult.Success;
      case "DUPLICATE_CAROUSEL_CHART":
        if (
          !this.getters.doesCarouselExist(cmd.carouselId) ||
          !this.getters
            .getCarousel(cmd.carouselId)
            .items.some((item) => item.type === "chart" && item.id === cmd.chartId) ||
          this.getters.getChart(cmd.duplicatedChartId)
        ) {
          return CommandResult.InvalidFigureId;
        }
        return CommandResult.Success;
      case "ADD_NEW_CHART_TO_CAROUSEL":
        if (!this.getters.doesCarouselExist(cmd.figureId)) {
          return CommandResult.InvalidFigureId;
        }
        return CommandResult.Success;

      case "UPDATE_CAROUSEL_ACTIVE_ITEM":
        if (!this.getters.doesCarouselExist(cmd.figureId)) {
          return CommandResult.InvalidFigureId;
        } else if (cmd.isDataView) {
          if (!this.getters.getCarousel(cmd.figureId).showDataView) {
            return CommandResult.InvalidCarouselItem;
          }
        } else if (
          !cmd.item ||
          !this.getters.getCarousel(cmd.figureId).items.some((item) => deepEquals(item, cmd.item))
        ) {
          return CommandResult.InvalidCarouselItem;
        }
        return CommandResult.Success;
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ADD_NEW_CHART_TO_CAROUSEL":
        this.addNewChartToCarousel(cmd.figureId, cmd.sheetId);
        break;
      case "ADD_FIGURE_CHART_TO_CAROUSEL":
        this.addFigureChartToCarousel(cmd.carouselFigureId, cmd.chartFigureId, cmd.sheetId);
        break;
      case "DUPLICATE_CAROUSEL_CHART":
        this.duplicateCarouselChart(cmd);
        break;
      case "UPDATE_CAROUSEL_ACTIVE_ITEM":
        if (cmd.isDataView) {
          this.carouselStates[cmd.figureId] = "__dataView__";
        } else if (cmd.item) {
          this.carouselStates[cmd.figureId] = cmd.item.id;
        }
        break;
      case "POPOUT_CHART_FROM_CAROUSEL":
        this.popOutChartFromCarousel(cmd.carouselId, cmd.chartId, cmd.sheetId);
        break;
      case "DELETE_FIGURE":
        delete this.carouselStates[cmd.figureId];
        break;
      case "UPDATE_CAROUSEL":
        this.fixWrongCarouselState(cmd.figureId);
        break;
      case "DELETE_CHART":
      case "UNDO":
      case "REDO":
      case "DELETE_SHEET":
        for (const figureId in this.carouselStates) {
          this.fixWrongCarouselState(figureId);
        }
        break;
    }
  }
  popOutChartFromCarousel(carouselId: UID, chartId: UID, sheetId: UID) {
    const carousel = this.getters.getCarousel(carouselId);
    if (!carousel) {
      return;
    }
    const figure = this.getters.getFigure(sheetId, carouselId);

    const chartDefinition = this.getters.getChartDefinition(chartId);
    if (!chartDefinition || !figure) {
      return;
    }
    const figureUI = this.getters.getFigureUI(sheetId, figure);
    const newAnchor = this.getters.getPositionAnchorOffset({
      x: figureUI.x + 50,
      y: figureUI.y + 50,
    });

    const newChartFigureId = UuidGenerator.smallUuid();
    this.dispatch("CREATE_CHART", {
      ...newAnchor,
      chartId: UuidGenerator.smallUuid(),
      figureId: newChartFigureId,
      sheetId,
      size: { width: figure.width, height: figure.height },
      definition: { ...chartDefinition },
    });
    const items = carousel.items.filter((item) => item.type !== "chart" || item.id !== chartId);
    this.dispatch("UPDATE_CAROUSEL", {
      sheetId,
      figureId: carouselId,
      definition: { ...carousel, items },
    });
    this.dispatch("SELECT_FIGURE", { figureId: newChartFigureId });
  }

  getSelectedCarouselItem(figureId: UID): CarouselItem | undefined {
    const carousel = this.getters.getCarousel(figureId);
    if (!carousel.items.length) {
      return undefined;
    }

    const state = this.carouselStates[figureId];
    if (state === "__dataView__") {
      return undefined;
    }

    return state ? carousel.items.find((item) => item.id === state) : carousel.items[0];
  }

  isDataViewActive(figureId: UID): boolean {
    return this.carouselStates[figureId] === "__dataView__";
  }

  getChartFromFigureId(figureId: UID): SpreadsheetChart | undefined {
    const sheetId = this.getters.getFigureSheetId(figureId);
    if (!sheetId) {
      return undefined;
    }
    const chartId = this.getChartIdFromFigureId(figureId);
    return chartId ? this.getters.getChart(chartId) : undefined;
  }

  getChartIdFromFigureId(figureId: UID): UID | undefined {
    const sheetId = this.getters.getFigureSheetId(figureId);
    if (!sheetId) {
      return undefined;
    }
    const figure = this.getters.getFigure(sheetId, figureId);
    if (!figure || (figure.tag !== "chart" && figure.tag !== "carousel")) {
      return undefined;
    }

    if (figure.tag === "carousel") {
      const carouselItem = this.getSelectedCarouselItem(figureId);
      return carouselItem?.type === "chart" ? carouselItem.id : undefined;
    }

    return this.getters
      .getChartIds(sheetId)
      .find((chartId) => this.getters.getFigureIdFromChartId(chartId) === figureId);
  }

  private fixWrongCarouselState(figureId: UID) {
    if (!this.getters.doesCarouselExist(figureId)) {
      delete this.carouselStates[figureId];
      return;
    }

    const carousel = this.getters.getCarousel(figureId);
    const state = this.carouselStates[figureId];

    if (state === "__dataView__" && !carousel.showDataView) {
      this.carouselStates[figureId] = carousel.items[0]?.id;
      return;
    }
    if (state === "__dataView__") {
      return;
    }

    if (carousel.items.length === 0) {
      delete this.carouselStates[figureId];
    } else if (!state) {
      this.carouselStates[figureId] = carousel.items[0].id;
    } else if (!carousel.items.some((item) => item.id === state)) {
      this.carouselStates[figureId] = carousel.items[0].id;
    }
  }

  private addNewChartToCarousel(figureId: string, sheetId: string) {
    const carousel = this.getters.getCarousel(figureId);
    const chartId = UuidGenerator.smallUuid();
    this.dispatch("CREATE_CHART", {
      chartId,
      figureId,
      sheetId,
      definition: CAROUSEL_DEFAULT_CHART_DEFINITION,
    });

    const definition: Carousel = {
      ...carousel,
      items: [...carousel.items, { type: "chart", id: chartId }],
    };
    this.dispatch("UPDATE_CAROUSEL", { sheetId, figureId, definition });
  }

  private addFigureChartToCarousel(figureId: UID, chartFigureId: UID, sheetId: string) {
    const chartId = this.getChartIdFromFigureId(chartFigureId);
    if (!chartId) {
      return;
    }
    const carousel = this.getters.getCarousel(figureId);

    const definition: Carousel = {
      ...carousel,
      items: [...carousel.items, { type: "chart", id: chartId }],
    };
    this.dispatch("UPDATE_CAROUSEL", { sheetId, figureId, definition });
    this.dispatch("UPDATE_CHART", {
      sheetId,
      chartId,
      figureId,
      definition: this.getters.getChartDefinition(chartId),
    });
    this.dispatch("DELETE_FIGURE", { sheetId, figureId: chartFigureId });
  }

  private duplicateCarouselChart({
    carouselId,
    chartId,
    sheetId,
    duplicatedChartId,
  }: DuplicateCarouselChartCommand) {
    const chart = this.getters.getChart(chartId);
    if (!chart) {
      return;
    }
    const carousel = this.getters.getCarousel(carouselId);

    const duplicatedItemIndex = carousel.items.findIndex(
      (item) => item.type === "chart" && item.id === chartId
    );
    if (duplicatedItemIndex === -1) {
      return;
    }

    this.dispatch("CREATE_CHART", {
      chartId: duplicatedChartId,
      figureId: carouselId,
      sheetId,
      definition: chart.getDefinition(),
    });

    const carouselItems = insertItemsAtIndex(
      carousel.items,
      [{ type: "chart", id: duplicatedChartId }],
      duplicatedItemIndex + 1
    );

    this.dispatch("UPDATE_CAROUSEL", {
      sheetId,
      figureId: carouselId,
      definition: { ...carousel, items: carouselItems },
    });
  }
}
