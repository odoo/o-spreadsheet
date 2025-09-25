import { CommandResult, Model, UID } from "../../../src";
import { CAROUSEL_DEFAULT_CHART_DEFINITION } from "../../../src/helpers/carousel_helpers";
import {
  addChartFigureToCarousel,
  addNewChartToCarousel,
  createCarousel,
  createChart,
  duplicateSheet,
  popOutChartFromCarousel,
  selectCarouselItem,
  updateCarousel,
  updateChart,
} from "../../test_helpers/commands_helpers";

let model: Model;
let sheetId: UID;

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
});

describe("Carousel figure", () => {
  describe("dispatch results", () => {
    test("Cannot create carousel with duplicated figure id", () => {
      createChart(model, { type: "bar" }, "chartId", undefined, { figureId: "figureId" });
      const result = createCarousel(model, { items: [] }, "figureId");
      expect(result).toBeCancelledBecause(CommandResult.DuplicatedFigureId);
    });

    test("Cannot update carousel with invalid figure id", () => {
      const result = model.dispatch("UPDATE_CAROUSEL", {
        figureId: "carouselId",
        sheetId,
        definition: { items: [] },
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidFigureId);
    });

    test("Cannot add a new chart to a non carousel-figure", () => {
      createChart(model, { type: "bar" }, "chartId", undefined, { figureId: "chartFigureId" });

      const sheetId = model.getters.getActiveSheetId();
      let result = model.dispatch("ADD_NEW_CHART_TO_CAROUSEL", { figureId: "invalidId", sheetId });
      expect(result).toBeCancelledBecause(CommandResult.InvalidFigureId);

      result = model.dispatch("ADD_NEW_CHART_TO_CAROUSEL", { figureId: "chartFigureId", sheetId });
      expect(result).toBeCancelledBecause(CommandResult.InvalidFigureId);
    });

    test("Cannot add an existing chart to a non-carousel figure", () => {
      createChart(model, { type: "bar" }, "chartId", undefined, { figureId: "chartFigureId" });
      createChart(model, { type: "bar" }, "chartId2", undefined, { figureId: "otherFigureId" });
      createCarousel(model, { items: [] }, "carouselId");
      createCarousel(model, { items: [] }, "otherCarouselId");

      let result = addChartFigureToCarousel(model, "chartFigureId", "otherFigureId");
      expect(result).toBeCancelledBecause(CommandResult.InvalidFigureId);

      result = addChartFigureToCarousel(model, "carouselId", "invalidId");
      expect(result).toBeCancelledBecause(CommandResult.InvalidFigureId);

      result = addChartFigureToCarousel(model, "otherCarouselId", "carouselId");
      expect(result).toBeCancelledBecause(CommandResult.InvalidFigureId);

      result = addChartFigureToCarousel(model, "carouselId", "chartFigureId");
      expect(result).toBeSuccessfullyDispatched();
    });

    test("Cannot update the carousel to a wrong state", () => {
      createCarousel(model, { items: [] }, "carouselId");
      const chartId = addNewChartToCarousel(model, "carouselId");

      let result = model.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
        figureId: "wrongCarouselId",
        sheetId,
        item: { type: "chart", chartId: "invalidChartId" },
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidFigureId);

      result = model.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
        figureId: "carouselId",
        sheetId,
        item: { type: "chart", chartId: "invalidChartId" },
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidCarouselItem);

      result = model.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
        figureId: "carouselId",
        sheetId,
        item: { type: "carouselDataView" },
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidCarouselItem);

      result = model.dispatch("UPDATE_CAROUSEL_ACTIVE_ITEM", {
        figureId: "carouselId",
        sheetId,
        item: { type: "chart", chartId },
      });
      expect(result).toBeSuccessfullyDispatched();
    });

    test("Cannot duplicate wrong carousel item", () => {
      createCarousel(model, { items: [] }, "carouselId");
      const chartId = addNewChartToCarousel(model, "carouselId");

      let result = model.dispatch("DUPLICATE_CAROUSEL_CHART", {
        carouselId: "wrongCarouselId",
        sheetId,
        chartId,
        duplicatedChartId: "anyId",
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidFigureId);

      result = model.dispatch("DUPLICATE_CAROUSEL_CHART", {
        carouselId: "carouselId",
        sheetId,
        chartId: "invalidChartId",
        duplicatedChartId: "anyId",
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidFigureId);
    });
  });

  test("Can create a carousel figure", () => {
    createCarousel(model, { items: [] }, "carouselId");
    expect(model.getters.getFigures(sheetId)).toHaveLength(1);
    expect(model.getters.getFigures(sheetId)[0].tag).toBe("carousel");
    expect(model.getters.getCarousel("carouselId")).toEqual({ items: [] });
  });

  test("Can update a carousel", () => {
    createCarousel(model, { items: [] }, "carouselId");
    expect(model.getters.getCarousel("carouselId").items).toEqual([]);

    updateCarousel(model, "carouselId", { items: [{ type: "carouselDataView" }] });
    expect(model.getters.getCarousel("carouselId").items).toEqual([{ type: "carouselDataView" }]);
  });

  test("Can add a new chart to a carousel", () => {
    createCarousel(model, { items: [] }, "carouselId");

    addNewChartToCarousel(model, "carouselId");

    const carouselItems = model.getters.getCarousel("carouselId").items;
    expect(carouselItems).toMatchObject([{ type: "chart", chartId: expect.any(String) }]);
    expect(model.getters.getChartDefinition(carouselItems[0]["chartId"])).toEqual(
      CAROUSEL_DEFAULT_CHART_DEFINITION
    );
    expect(model.getters.getFigureIdFromChartId(carouselItems[0]["chartId"])).toBe("carouselId");
  });

  test("Can add an existing chart to a carousel", () => {
    createCarousel(model, { items: [] }, "carouselId");
    createChart(model, { type: "radar" }, "chartId", undefined, { figureId: "chartFigureId" });
    expect(model.getters.getFigures(sheetId)).toHaveLength(2);

    addChartFigureToCarousel(model, "carouselId", "chartFigureId");

    expect(model.getters.getCarousel("carouselId").items).toEqual([
      { type: "chart", chartId: "chartId" },
    ]);
    expect(model.getters.getChartDefinition("chartId")).toMatchObject({ type: "radar" });
    expect(model.getters.getFigureIdFromChartId("chartId")).toBe("carouselId");
    expect(model.getters.getFigures(sheetId)).toHaveLength(1);
  });

  test("Can pop a chart out of a carousel", () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId");
    expect(model.getters.getFigures(sheetId)).toHaveLength(1);
    const carouselFigureId = model.getters.getFigures(sheetId)![0].id;
    const carousel = model.getters.getCarousel(carouselFigureId);
    const chartId = carousel.items[0]["chartId"];

    popOutChartFromCarousel(model, sheetId, carouselFigureId, chartId);
    expect(model.getters.getCarousel(carouselFigureId).items).toHaveLength(0);

    const newFigures = model.getters.getFigures(sheetId);
    expect(newFigures).toHaveLength(2); // the carousel is still there, but without chart
    expect(newFigures[0].tag).toBe("carousel");
    expect(model.getters.getCarousel(carouselFigureId).items).toHaveLength(0);
    expect(newFigures[1].tag).toBe("chart");
  });

  test("Can duplicate a sheet with a carousel", () => {
    createCarousel(model, { items: [] }, "carouselId");
    const chartId = addNewChartToCarousel(model, "carouselId");

    duplicateSheet(model, sheetId, "newSheetId");

    const carouselItems = model.getters.getCarousel("carouselId").items;
    expect(carouselItems).toMatchObject([{ type: "chart", chartId }]);
    expect(model.getters.getChartDefinition(chartId)).toEqual(CAROUSEL_DEFAULT_CHART_DEFINITION);
    expect(model.getters.getFigureIdFromChartId(chartId)).toBe("carouselId");

    const newCarouselId = model.getters.getFigures("newSheetId")[0].id;
    const newChartId = "newSheetId??" + chartId;
    expect(model.getters.getFigures("newSheetId")).toHaveLength(1);
    expect(model.getters.getFigures("newSheetId")[0].tag).toBe("carousel");
    expect(model.getters.getCarousel(newCarouselId).items).toEqual([
      { type: "chart", chartId: newChartId },
    ]);
    expect(model.getters.getChartDefinition("newSheetId??" + chartId)).toEqual(
      CAROUSEL_DEFAULT_CHART_DEFINITION
    );
    expect(model.getters.getFigureIdFromChartId("newSheetId??" + chartId)).toBe(newCarouselId);
  });

  test("Can export/import a carousel and its charts", () => {
    const title = { text: "Title1", fontSize: 20, bold: true };
    createCarousel(model, { items: [], title }, "carouselId");
    addNewChartToCarousel(model, "carouselId");
    const chartId = model.getters.getCarousel("carouselId").items[0]["chartId"];
    updateChart(model, chartId, { type: "pyramid", dataSets: [{ dataRange: "A1:A6" }] });

    createChart(model, { type: "radar" }, "chartId2", undefined, { figureId: "chartFigureId" });
    addChartFigureToCarousel(model, "carouselId", "chartFigureId");

    const newModel = new Model(model.exportData());
    expect(newModel.getters.getFigures(sheetId)).toHaveLength(1);
    expect(newModel.getters.getCarousel("carouselId").title).toEqual(title);
    expect(newModel.getters.getCarousel("carouselId").items).toEqual([
      { type: "chart", chartId },
      { type: "chart", chartId: "chartId2" },
    ]);
    expect(newModel.getters.getChartDefinition(chartId)).toMatchObject({
      type: "pyramid",
      dataSets: [{ dataRange: "A1:A6" }],
    });
    expect(newModel.getters.getChartDefinition("chartId2")).toMatchObject({ type: "radar" });
  });

  test("Carousel item is still selected when changing its name", () => {
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
    const chartId = addNewChartToCarousel(model, "carouselId");
    selectCarouselItem(model, "carouselId", { type: "chart", chartId });

    expect(model.getters.getSelectedCarouselItem("carouselId")).toEqual({ type: "chart", chartId });

    updateCarousel(model, "carouselId", {
      items: [{ type: "carouselDataView" }, { type: "chart", chartId, title: "Title" }],
    });
    expect(model.getters.getSelectedCarouselItem("carouselId")).toEqual({
      type: "chart",
      chartId,
      title: "Title",
    });
  });
});
