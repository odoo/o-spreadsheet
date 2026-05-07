import { FIGURE_ID_SPLITTER } from "../../constants";
import { deepCopy } from "../../helpers/misc";
import { CommandResult, CoreCommand, UpdateCarouselCommand } from "../../types/commands";
import { Carousel, CarouselItem } from "../../types/figure";
import { UID } from "../../types/misc";
import { WorkbookData } from "../../types/workbook_data";
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
        this.removeDeletedItems(cmd, this.getters.getCarousel(cmd.figureId).items);
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
                  ...carousel,
                  items: carousel.items.map((item): CarouselItem => {
                    if (item.type === "dataLayer") {
                      const dlIdBase = item.id.split(FIGURE_ID_SPLITTER).pop();
                      const newDlId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${dlIdBase}`;
                      const definition = deepCopy(this.getters.getDataLayer(item.id));
                      this.dispatch("CREATE_DATA_LAYER", {
                        dataLayerId: newDlId,
                        figureId: duplicatedFigureId,
                        sheetId: cmd.sheetIdTo,
                        col: fig.col,
                        row: fig.row,
                        offset: fig.offset,
                        size,
                        definition,
                      });
                      return { ...item, id: newDlId };
                    }
                    const chartIdBase = item.id.split(FIGURE_ID_SPLITTER).pop();
                    const newChartId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${chartIdBase}`;
                    return { ...item, id: newChartId };
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

  private removeDeletedItems(cmd: UpdateCarouselCommand, oldItems: CarouselItem[]) {
    const newIds = new Set(cmd.definition.items.map((item) => item.id));

    for (const item of oldItems) {
      if (newIds.has(item.id)) {
        continue;
      }
      if (item.type === "chart") {
        this.dispatch("DELETE_CHART", { chartId: item.id, sheetId: cmd.sheetId });
      }
      if (item.type === "dataLayer") {
        this.dispatch("DELETE_DATA_LAYER", { dataLayerId: item.id, sheetId: cmd.sheetId });
      }
    }
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const carousels = (sheet.figures || []).filter((figure) => figure.tag === "carousel");
      for (const carousel of carousels) {
        // Migrate old carouselDataView items to showDataView setting
        const oldItems = carousel.data.items || [];
        const hasDataView = oldItems.some((item: any) => item.type === "carouselDataView");
        const items = oldItems.filter((item: any) => item.type !== "carouselDataView");
        // Migrate old item format: chartId/dataLayerId → id
        for (const item of items) {
          if (item.chartId && !item.id) {
            item.id = item.chartId;
            delete item.chartId;
          }
          if (item.dataLayerId && !item.id) {
            item.id = item.dataLayerId;
            delete item.dataLayerId;
          }
        }
        this.history.update("carousels", sheet.id, carousel.id, {
          items,
          title: carousel.data.title,
          layout: carousel.data.layout,
          columns: carousel.data.columns,
          showDataView: hasDataView || carousel.data.showDataView || undefined,
        });
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const carousels = sheet.figures.filter((figure) => figure.tag === "carousel");
      for (const carousel of carousels) {
        if (this.carousels[sheet.id]?.[carousel.id]) {
          carousel.data = { ...carousel.data, ...this.carousels[sheet.id]?.[carousel.id] };
        }
      }
    }
  }
}
