import { FIGURE_ID_SPLITTER } from "../../constants";
import { UuidGenerator } from "../../helpers";
import {
  Carousel,
  CarouselItem,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  UID,
  UpdateCarouselCommand,
  WorkbookData,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface CarouselState {
  readonly carousels: Record<UID, Record<UID, Carousel | undefined> | undefined>;
}

export class CarouselPlugin extends CorePlugin<CarouselState> implements CarouselState {
  static getters = ["getCarousel", "doesCarouselExist"] as const;
  readonly carousels: Record<UID, Record<UID, Carousel | undefined> | undefined> = {};

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
      case "CREATE_CAROUSEL":
        if (!this.getters.getFigure(cmd.sheetId, cmd.figureId)) {
          this.dispatch("CREATE_FIGURE", { ...cmd, tag: "carousel" });
        }
        this.history.update("carousels", cmd.sheetId, cmd.figureId, cmd.definition);
        break;
      case "UPDATE_CAROUSEL":
        this.removeDeletedCharts(cmd, this.getters.getCarousel(cmd.figureId).items);
        this.history.update("carousels", cmd.sheetId, cmd.figureId, cmd.definition);
        break;
      case "DUPLICATE_SHEET": {
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetId);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "carousel") {
            const figureIdBase = fig.id.split(FIGURE_ID_SPLITTER).pop();
            const duplicatedFigureId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${figureIdBase}`;
            const carousel = this.getCarousel(fig.id);
            if (carousel) {
              const size = { width: fig.width, height: fig.height };
              this.dispatch("CREATE_CAROUSEL", {
                sheetId: cmd.sheetIdTo,
                figureId: duplicatedFigureId,
                offset: fig.offset,
                col: fig.col,
                row: fig.row,
                size,
                definition: {
                  items: carousel.items.map((item): CarouselItem => {
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

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const carouselId in sheet.carousels || {}) {
        const { carousel } = sheet.carousels[carouselId];
        this.history.update("carousels", sheet.id, carouselId, carousel);
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const carouselId in this.carousels[sheet.id] || {}) {
        const carousel = this.carousels[sheet.id]?.[carouselId];
        if (carousel) {
          sheet.carousels[carouselId] = { figureId: carouselId, carousel };
        }
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData): void {
    // TODO ask around: should I create mock figure here, or at the xlsx_writer ? The problem of creating here is that the
    // figures are only in the workbook, making calls to getters wrong inside the plugins following this
    const uuidGenerator = new UuidGenerator();
    for (const sheet of data.sheets) {
      for (const carouselId in this.carousels[sheet.id] || {}) {
        const carouselFigure = sheet.figures.find((fig) => fig.id === carouselId);
        const carousel = this.carousels[sheet.id]?.[carouselId];
        if (!carouselFigure || !carousel) {
          continue;
        }
        sheet.figures = sheet.figures.filter((fig) => fig.id !== carouselId);

        let offset = 0;
        for (const item of carousel.items) {
          if (item.type === "chart") {
            const chartData = sheet.charts[item.chartId];
            const newFigure = {
              ...carouselFigure,
              id: uuidGenerator.smallUuid(),
              tag: "chart",
              offset: { x: carouselFigure.offset.x + offset, y: carouselFigure.offset.y },
            };
            offset += 20;
            chartData.figureId = newFigure.id;
            sheet.figures.push(newFigure);
          }
        }
      }
    }
  }
}
