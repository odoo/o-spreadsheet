import {
  AbstractChart,
  Carousel,
  CarouselItem,
  Command,
  DuplicateCarouselChartCommand,
  UID,
} from "../..";
import { deepEquals, insertItemsAtIndex, UuidGenerator } from "../../helpers";
import { CAROUSEL_DEFAULT_CHART_DEFINITION } from "../../helpers/carousel_helpers";
import { CommandResult, LocalCommand } from "../../types";
import { UIPlugin } from "../ui_plugin";

export class CarouselUIPlugin extends UIPlugin {
  static getters = [
    "getSelectedCarouselItem",
    "getChartFromFigureId",
    "getChartIdFromFigureId",
  ] as const;

  private uuidGenerator = new UuidGenerator();

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
            .items.some((item) => item.type === "chart" && item.chartId === cmd.chartId) ||
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
        } else if (
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
        this.carouselStates[cmd.figureId] = this.getCarouselItemId(cmd.item);
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

    const newChartFigureId = this.uuidGenerator.smallUuid();
    this.dispatch("CREATE_CHART", {
      ...newAnchor,
      chartId: this.uuidGenerator.smallUuid(),
      figureId: newChartFigureId,
      sheetId,
      size: { width: figure.width, height: figure.height },
      definition: { ...chartDefinition },
    });
    const items = carousel.items.filter(
      (item) => item.type !== "chart" || item.chartId !== chartId
    );
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

    return this.carouselStates[figureId]
      ? carousel.items.find(
          (item) => this.getCarouselItemId(item) === this.carouselStates[figureId]
        )
      : carousel.items[0];
  }

  getChartFromFigureId(figureId: UID): AbstractChart | undefined {
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
      return carouselItem?.type === "chart" ? carouselItem.chartId : undefined;
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
    if (carousel.items.length === 0) {
      delete this.carouselStates[figureId];
    } else if (!this.carouselStates[figureId]) {
      this.carouselStates[figureId] = this.getCarouselItemId(carousel.items[0]);
    } else if (
      !carousel.items.some((item) => this.getCarouselItemId(item) === this.carouselStates[figureId])
    ) {
      this.carouselStates[figureId] = this.getCarouselItemId(carousel.items[0]);
    }
  }

  private addNewChartToCarousel(figureId: string, sheetId: string) {
    const carousel = this.getters.getCarousel(figureId);
    const chartId = this.uuidGenerator.smallUuid();
    this.dispatch("CREATE_CHART", {
      chartId,
      figureId,
      sheetId,
      definition: CAROUSEL_DEFAULT_CHART_DEFINITION,
    });

    const definition: Carousel = {
      ...carousel,
      items: [...carousel.items, { type: "chart", chartId }],
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
      items: [...carousel.items, { type: "chart", chartId }],
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
      (item) => item.type === "chart" && item.chartId === chartId
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
      [{ type: "chart", chartId: duplicatedChartId }],
      duplicatedItemIndex + 1
    );

    this.dispatch("UPDATE_CAROUSEL", {
      sheetId,
      figureId: carouselId,
      definition: { ...carousel, items: carouselItems },
    });
  }

  private getCarouselItemId(item: CarouselItem): UID {
    return item.type === "chart" ? item.chartId : "carouselDataView";
  }
}
