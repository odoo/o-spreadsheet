import { FIGURE_ID_SPLITTER } from "../../constants";
import { CommandResult, CoreCommand, UpdateCarouselCommand } from "../../types/commands";
import { Carousel, CarouselData, CarouselItem, CarouselItemData } from "../../types/figure";
import { RangeAdapterFunctions, UID } from "../../types/misc";
import { WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

interface CarouselState {
  readonly carousels: Record<UID, Record<UID, Carousel | undefined> | undefined>;
}

export class CarouselPlugin extends CorePlugin<CarouselState> implements CarouselState {
  static getters = ["getCarousel", "doesCarouselExist", "carouselToCarouselData"] as const;
  readonly carousels: Record<UID, Record<UID, Carousel | undefined> | undefined> = {};

  adaptRanges(rangeAdapterFunctions: RangeAdapterFunctions): void {
    for (const sheetId in this.carousels) {
      for (const figureId in this.carousels[sheetId] || []) {
        const carousel = this.carousels[sheetId]?.[figureId];
        if (!carousel) {
          continue;
        }
        for (let i = 0; i < carousel.items.length; i++) {
          const item = carousel.items[i];
          if (item.type === "carouselDataView" && item.range) {
            const change = rangeAdapterFunctions.applyChange(item.range);
            const newItem = { ...item, range: change.range };
            this.history.update("carousels", sheetId, figureId, "items", i, newItem);
          }
        }
      }
    }
  }

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_CAROUSEL": {
        if (this.getters.getFigure(cmd.sheetId, cmd.figureId)) {
          return CommandResult.DuplicatedFigureId;
        }
        return CommandResult.Success;
      }
      case "UPDATE_CAROUSEL": {
        if (!this.carousels[cmd.sheetId]?.[cmd.figureId]) {
          return CommandResult.InvalidFigureId;
        }
        return CommandResult.Success;
      }
    }

    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_CAROUSEL": {
        if (!this.getters.getFigure(cmd.sheetId, cmd.figureId)) {
          this.dispatch("CREATE_FIGURE", { ...cmd, tag: "carousel" });
        }
        const carousel = this.carouselDataToCarousel(cmd.definition);
        this.history.update("carousels", cmd.sheetId, cmd.figureId, carousel);
        break;
      }
      case "UPDATE_CAROUSEL": {
        this.removeDeletedCharts(cmd, this.getters.getCarousel(cmd.figureId).items);
        const carousel = this.carouselDataToCarousel(cmd.definition);
        this.history.update("carousels", cmd.sheetId, cmd.figureId, carousel);
        break;
      }
      case "DUPLICATE_SHEET": {
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetId);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "carousel") {
            const figureIdBase = fig.id.split(FIGURE_ID_SPLITTER).pop();
            const duplicatedFigureId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${figureIdBase}`;
            const carousel = this.getCarousel(fig.id);
            if (carousel) {
              const size = { width: fig.width, height: fig.height };
              const carouselData = this.carouselToCarouselData(carousel);
              this.dispatch("CREATE_CAROUSEL", {
                sheetId: cmd.sheetIdTo,
                figureId: duplicatedFigureId,
                offset: fig.offset,
                col: fig.col,
                row: fig.row,
                size,
                definition: {
                  ...carouselData,
                  items: carouselData.items.map((item): CarouselItemData => {
                    if (item.type === "carouselDataView") {
                      return { ...item };
                    }
                    const chartIdBase = item.chartId.split(FIGURE_ID_SPLITTER).pop();
                    const newChartId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${chartIdBase}`;
                    return { ...item, chartId: newChartId };
                  }),
                },
              });
            }
          }
        }
        break;
      }
      case "DELETE_FIGURE":
        this.history.update("carousels", cmd.sheetId, cmd.figureId, undefined);
        break;
      case "DELETE_SHEET":
        this.history.update("carousels", cmd.sheetId, undefined);
        break;
    }
  }

  doesCarouselExist(figureId: UID): boolean {
    for (const sheetId in this.carousels) {
      if (this.carousels[sheetId]?.[figureId]) {
        return true;
      }
    }
    return false;
  }

  getCarousel(figureId: UID): Carousel {
    for (const sheetId in this.carousels) {
      if (this.carousels[sheetId]?.[figureId]) {
        return this.carousels[sheetId][figureId];
      }
    }
    throw new Error(`There is no carousel with the given figureId: ${figureId}`);
  }

  private removeDeletedCharts(cmd: UpdateCarouselCommand, oldItems: CarouselItem[]) {
    const newChartIds = new Set(
      cmd.definition.items.filter((item) => item.type === "chart").map((item) => item.chartId)
    );

    for (const item of oldItems) {
      if (item.type === "chart" && !newChartIds.has(item.chartId)) {
        this.dispatch("DELETE_CHART", { chartId: item.chartId, sheetId: cmd.sheetId });
      }
    }
  }

  private carouselDataToCarousel(carouselData: CarouselData): Carousel {
    return {
      ...carouselData,
      items: carouselData.items.map((item) => {
        if (item.type === "carouselDataView") {
          return {
            type: "carouselDataView",
            title: item.title,
            range: item.rangeData ? this.getters.getRangeFromRangeData(item.rangeData) : undefined,
          };
        }
        return item;
      }),
    };
  }

  carouselToCarouselData(carousel: Carousel): CarouselData {
    return {
      ...carousel,
      items: carousel.items.map((item) => {
        if (item.type === "carouselDataView") {
          return {
            type: "carouselDataView",
            title: item.title,
            rangeData: item.range ? this.getters.getRangeData(item.range) : undefined,
          };
        }
        return item;
      }),
    };
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const carousels = (sheet.figures || []).filter((figure) => figure.tag === "carousel");
      for (const figure of carousels) {
        const carousel = this.carouselDataToCarousel(figure.data);
        this.history.update("carousels", sheet.id, figure.id, carousel);
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const carousels = sheet.figures.filter((figure) => figure.tag === "carousel");
      for (const carouselData of carousels) {
        const carousel = this.carousels[sheet.id]?.[carouselData.id];
        if (carousel) {
          const carouselDefinition = this.carouselToCarouselData(carousel);
          carouselData.data = { ...carouselData.data, ...carouselDefinition };
        }
      }
    }
  }
}
