import { SpreadsheetChart } from "../../helpers/figures/chart";
import { insertItemsAtIndex } from "../../helpers/misc";
import { UuidGenerator } from "../../helpers/uuid";
import { ChartDefinition } from "../../types/chart/chart";
import {
  AddFiguresChartToCarouselCommand,
  AddNewChartToCarouselCommand,
  CommandResult,
  DeleteFigureCommand,
  DuplicateCarouselChartCommand,
  PopOutChartFromCarouselCommand,
  UpdateCarouselActiveItemCommand,
  UpdateCarouselCommand,
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

  validators = {
    ADD_FIGURES_CHART_TO_CAROUSEL: this.checkAddFiguresChartToCarousel,
    DUPLICATE_CAROUSEL_CHART: this.checkDuplicateCarouselChart,
    ADD_NEW_CHART_TO_CAROUSEL: this.checkCarouselExists,
    UPDATE_CAROUSEL_ACTIVE_ITEM: this.checkUpdateCarouselActiveItem,
  };

  handlers = {
    DELETE_CHART: this.fixWrongCarouselStates,
    DELETE_FIGURE: this.onDeleteFigure,
    UPDATE_CAROUSEL: this.onUpdateCarousel,
    ADD_NEW_CHART_TO_CAROUSEL: this.onAddNewChartToCarousel,
    ADD_FIGURES_CHART_TO_CAROUSEL: this.onAddFiguresChartToCarousel,
    DUPLICATE_CAROUSEL_CHART: this.onDuplicateCarouselChart,
    UPDATE_CAROUSEL_ACTIVE_ITEM: this.onUpdateCarouselActiveItem,
    POPOUT_CHART_FROM_CAROUSEL: this.onPopoutChartFromCarousel,
    DELETE_SHEET: this.fixWrongCarouselStates,
    UNDO: this.fixWrongCarouselStates,
    REDO: this.fixWrongCarouselStates,
  };

  private onUpdateCarouselActiveItem(cmd: UpdateCarouselActiveItemCommand) {
    this.carouselStates[cmd.carouselId] = cmd.itemIndex;
  }

  private onAddFiguresChartToCarousel(cmd: AddFiguresChartToCarouselCommand) {
    cmd.chartFigureIds.forEach((figureId) => {
      this.addFigureChartToCarousel(cmd.carouselId, figureId, cmd.sheetId);
    });
  }

  private onAddNewChartToCarousel(cmd: AddNewChartToCarouselCommand) {
    this.addNewChartToCarousel(cmd.carouselId, cmd.newChartId, cmd.sheetId, cmd.chartDefinition);
  }

  private onUpdateCarousel(cmd: UpdateCarouselCommand) {
    this.fixWrongCarouselState(cmd.figureId);
  }

  private onDeleteFigure(cmd: DeleteFigureCommand) {
    delete this.carouselStates[cmd.figureId];
  }

  private fixWrongCarouselStates() {
    for (const figureId in this.carouselStates) {
      this.fixWrongCarouselState(figureId);
    }
  }

  private checkAddFiguresChartToCarousel(cmd: AddFiguresChartToCarouselCommand) {
    if (
      !this.getters.doesCarouselExist(cmd.carouselId) ||
      cmd.chartFigureIds.some(
        (figureId) => this.getters.getFigure(cmd.sheetId, figureId)?.tag !== "chart"
      )
    ) {
      return CommandResult.InvalidFigureId;
    }
    return CommandResult.Success;
  }

  private checkDuplicateCarouselChart(cmd: DuplicateCarouselChartCommand) {
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
  }

  private checkCarouselExists(cmd: AddNewChartToCarouselCommand) {
    return this.getters.doesCarouselExist(cmd.carouselId)
      ? CommandResult.Success
      : CommandResult.InvalidFigureId;
  }

  private checkUpdateCarouselActiveItem(cmd: UpdateCarouselActiveItemCommand) {
    if (!this.getters.doesCarouselExist(cmd.carouselId)) {
      return CommandResult.InvalidFigureId;
    }
    if (
      cmd.itemIndex < 0 ||
      cmd.itemIndex >= this.getters.getCarousel(cmd.carouselId).items.length
    ) {
      return CommandResult.InvalidCarouselIndex;
    }
    return CommandResult.Success;
  }

  onPopoutChartFromCarousel(cmd: PopOutChartFromCarouselCommand) {
    const { carouselId, chartId, sheetId, col, row, offset } = cmd;
    const carousel = this.getters.getCarousel(carouselId);
    if (!carousel) {
      return;
    }
    const figure = this.getters.getFigure(sheetId, carouselId);
    if (!figure) {
      return;
    }
    const chartDefinition = this.getters.getChartDefinition(chartId);
    if (!chartDefinition) {
      return;
    }
    const chartIndex = carousel.items.findIndex(
      (item) => item.type === "chart" && item.chartId === chartId
    );
    if (chartIndex === -1) {
      return;
    }
    const selectedItemIndex = this.getSelectedCarouselItemIndex(carouselId);
    if (selectedItemIndex === undefined) {
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

  private onDuplicateCarouselChart({
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
