import { CommandResult, Model, UID } from "../../../src";
import { CAROUSEL_DEFAULT_CHART_DEFINITION } from "../../../src/helpers/carousel_helpers";
import {
  addChartFigureToCarousel,
  addNewChartToCarousel,
  createCarousel,
  createChart,
  duplicateSheet,
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
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId");
    const chartId = model.getters.getCarousel("carouselId").items[0]["chartId"];
    updateChart(model, chartId, { type: "pyramid", dataSets: [{ dataRange: "A1:A6" }] });

    createChart(model, { type: "radar" }, "chartId2", undefined, { figureId: "chartFigureId" });
    addChartFigureToCarousel(model, "carouselId", "chartFigureId");

    const newModel = new Model(model.exportData());
    expect(newModel.getters.getFigures(sheetId)).toHaveLength(1);
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
});
