import { SpreadsheetChart } from "../../helpers/figures/chart";
import { insertItemsAtIndex } from "../../helpers/misc";
import { UuidGenerator } from "../../helpers/uuid";
import { ChartDefinition } from "../../types/chart/chart";
import {
  Command,
  CommandResult,
  DuplicateCarouselChartCommand,
  LocalCommand,
  PopOutChartFromCarouselCommand,
} from "../../types/commands";
import { Carousel, CarouselItem } from "../../types/figure";
import { UID } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class CarouselUIPlugin extends UIPlugin {
  static getters = [
    "getSelectedCarouselItem",
    "getSelectedCarouselItemIndex",
    "getChartFromFigureId",
    "getChartIdFromFigureId",
  ] as const;

  carouselStates: Record<UID, number | undefined> = {};

  allowDispatch(cmd: LocalCommand): CommandResult | CommandResult[] {
    switch (cmd.type) {
      case "ADD_FIGURES_CHART_TO_CAROUSEL":
        if (
          !this.getters.doesCarouselExist(cmd.carouselId) ||
          cmd.chartFigureIds.some(
            (figureId) => this.getters.getFigure(cmd.sheetId, figureId)?.tag !== "chart"
          )
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
        if (!this.getters.doesCarouselExist(cmd.carouselId)) {
          return CommandResult.InvalidFigureId;
        }
        return CommandResult.Success;

      case "UPDATE_CAROUSEL_ACTIVE_ITEM":
        if (!this.getters.doesCarouselExist(cmd.carouselId)) {
          return CommandResult.InvalidFigureId;
        } else if (
          cmd.itemIndex < 0 ||
          cmd.itemIndex >= this.getters.getCarousel(cmd.carouselId).items.length
        ) {
          return CommandResult.InvalidCarouselIndex;
        }
        return CommandResult.Success;
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ADD_NEW_CHART_TO_CAROUSEL":
        this.addNewChartToCarousel(
          cmd.carouselId,
          cmd.newChartId,
          cmd.sheetId,
          cmd.chartDefinition
        );
        break;
      case "ADD_FIGURES_CHART_TO_CAROUSEL":
        cmd.chartFigureIds.forEach((figureId) => {
          this.addFigureChartToCarousel(cmd.carouselId, figureId, cmd.sheetId);
        });
        break;
      case "DUPLICATE_CAROUSEL_CHART":
        this.duplicateCarouselChart(cmd);
        break;
      case "UPDATE_CAROUSEL_ACTIVE_ITEM":
        this.carouselStates[cmd.carouselId] = cmd.itemIndex;
        break;
      case "POPOUT_CHART_FROM_CAROUSEL":
        this.popOutChartFromCarousel(cmd);
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

  popOutChartFromCarousel(cmd: PopOutChartFromCarouselCommand) {
    const { carouselId, chartId, sheetId, col, row, offset } = cmd;
    const carousel = this.getters.getCarousel(carouselId);
    if (!carousel) {
      return;
    }
    const figure = this.getters.getFigure(sheetId, carouselId);
    const chartDefinition = this.getters.getChartDefinition(chartId);
    const chartIndex = carousel.items.findIndex(
      (item) => item.type === "chart" && item.chartId === chartId
    );
    const selectedItemIndex = this.getSelectedCarouselItemIndex(carouselId);
    if (!chartDefinition || !figure || chartIndex === -1 || selectedItemIndex === undefined) {
      return;
    }

    const newChartFigureId = UuidGenerator.smallUuid();
    this.dispatch("CREATE_CHART", {
      col,
      row,
      offset,
      chartId: UuidGenerator.smallUuid(),
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
      definition: this.getters.carouselToCarouselData({ ...carousel, items }),
    });
    if (chartIndex < selectedItemIndex) {
      this.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
        carouselId,
        sheetId,
        itemIndex: selectedItemIndex - 1,
      });
    }
    this.dispatch("SELECT_FIGURE", { figureId: newChartFigureId });
  }

  getSelectedCarouselItem(figureId: UID): CarouselItem | undefined {
    const carousel = this.getters.getCarousel(figureId);
    if (!carousel.items.length) {
      return undefined;
    }
    const index = this.carouselStates[figureId] || 0;
    return carousel.items[index];
  }

  getSelectedCarouselItemIndex(figureId: UID): number | undefined {
    const carousel = this.getters.getCarousel(figureId);
    if (!carousel.items.length) {
      return undefined;
    }
    return this.carouselStates[figureId] || 0;
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
      this.carouselStates[figureId] = 0;
    } else if (this.carouselStates[figureId]! >= carousel.items.length) {
      this.carouselStates[figureId] = 0;
    }
  }

  private addNewChartToCarousel(
    figureId: string,
    chartId: string,
    sheetId: string,
    chartDefinition: ChartDefinition<string>
  ) {
    const carousel = this.getters.getCarousel(figureId);
    this.dispatch("CREATE_CHART", {
      chartId,
      figureId,
      sheetId,
      definition: chartDefinition,
    });

    const carouselItem: CarouselItem = { type: "chart", chartId };
    const definition: Carousel = { ...carousel, items: [...carousel.items, carouselItem] };
    this.dispatch("UPDATE_CAROUSEL", {
      sheetId,
      figureId,
      definition: this.getters.carouselToCarouselData(definition),
    });
    this.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
      carouselId: figureId,
      sheetId,
      itemIndex: definition.items.length - 1,
    });
  }

  private addFigureChartToCarousel(figureId: UID, chartFigureId: UID, sheetId: string) {
    const chartId = this.getChartIdFromFigureId(chartFigureId);
    if (!chartId) {
      return;
    }
    const carousel = this.getters.getCarousel(figureId);

    const newItem: CarouselItem = { type: "chart", chartId };
    const definition: Carousel = {
      ...carousel,
      items: [...carousel.items, newItem],
    };
    this.dispatch("UPDATE_CAROUSEL", {
      sheetId,
      figureId,
      definition: this.getters.carouselToCarouselData(definition),
    });
    this.dispatch("UPDATE_CHART", {
      sheetId,
      chartId,
      figureId,
      definition: this.getters.getChartDefinition(chartId),
    });
    this.dispatch("DELETE_FIGURE", { sheetId, figureId: chartFigureId });
    this.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
      carouselId: figureId,
      sheetId,
      itemIndex: definition.items.length - 1,
    });
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

    const selectedItemIndex = this.getSelectedCarouselItemIndex(carouselId);
    const duplicatedItemIndex = carousel.items.findIndex(
      (item) => item.type === "chart" && item.chartId === chartId
    );
    if (duplicatedItemIndex === -1 || selectedItemIndex === undefined) {
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
      definition: this.getters.carouselToCarouselData({ ...carousel, items: carouselItems }),
    });
    if (duplicatedItemIndex < selectedItemIndex) {
      this.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
        carouselId,
        sheetId,
        itemIndex: selectedItemIndex + 1,
      });
    }
  }
}
