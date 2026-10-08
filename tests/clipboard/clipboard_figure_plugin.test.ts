import { CommandResult, Model, UID } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { parseOSClipboardContent } from "../../src/helpers/clipboard/clipboard_helpers";
import { UuidGenerator } from "../../src/helpers/uuid";
import { toZone } from "../../src/helpers/zones";
import { ClipboardStore } from "../../src/stores/clipboard_store";
import { toChartDataSource } from "../test_helpers/chart_helpers";
import {
  activateSheet,
  addNewChartToCarousel,
  copy,
  createCarousel,
  createChart,
  createImage,
  createSheet,
  cut,
  deleteFigure,
  deleteSheet,
  paste,
  redo,
  selectFigure,
  setCellContent,
  setSelection,
  undo,
  updateChart,
  updateFigure,
} from "../test_helpers/commands_helpers";
import { getCellContent } from "../test_helpers/getters_helpers";
import {
  getFigureDefinition,
  getFigureIds,
  mockChart,
  nextTick,
  target,
} from "../test_helpers/helpers";
import { makeStore } from "../test_helpers/stores";

mockChart();

describe.each(["chart", "image"])("Clipboard for %s figures", (type: string) => {
  let model: Model;
  let clipboardStore: ClipboardStore;
  let sheetId: UID;
  let figureId: UID;

  beforeEach(async () => {
    ({ model, store: clipboardStore } = makeStore(ClipboardStore));
    sheetId = model.getters.getActiveSheetId();
    figureId = UuidGenerator.uuidv4();
    if (type === "chart") {
      createChart(model, { type: "bar" }, "chartId", undefined, { figureId });
    } else if (type === "image") {
      createImage(model, { figureId });
    }
    await nextTick();
  });

  function getCopiedFigureId(sheet?: UID) {
    const ids = getFigureIds(model, sheet || sheetId, type);
    return ids.find((id) => id !== figureId)!;
  }

  test(`Can copy and paste ${type}`, () => {
    selectFigure(model, figureId);
    copy(model);
    paste(model, "A1");
    const figureIds = getFigureIds(model, sheetId);
    expect(figureIds).toHaveLength(2);
    expect(getFigureDefinition(model, figureId, type)).toEqual(
      getFigureDefinition(model, getCopiedFigureId(), type)
    );
  });

  test("Can cut and paste figure", () => {
    selectFigure(model, figureId);
    const figureDef = getFigureDefinition(model, figureId, type);
    cut(model);
    paste(model, "A1");
    const figureIds = getFigureIds(model, sheetId, type);
    expect(figureIds).toHaveLength(1);
    expect(getFigureDefinition(model, getCopiedFigureId(), type)).toEqual(figureDef);
  });

  test("Clipboard will copy figure instead of cells if a figure is selected", () => {
    setCellContent(model, "A1", "1");
    setSelection(model, ["A1"]);
    selectFigure(model, figureId);
    copy(model);
    paste(model, "A2");
    expect(getCellContent(model, "A2")).toEqual("");
    expect(model.getters.getFigures(sheetId)).toHaveLength(2);
  });

  test("Can copy and paste figure to another sheet", () => {
    selectFigure(model, figureId);
    copy(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");
    expect(getFigureIds(model, sheetId, type)).toHaveLength(1);
    expect(getFigureIds(model, "42", type)).toHaveLength(1);
    expect(getFigureDefinition(model, figureId, type)).toEqual(
      getFigureDefinition(model, getCopiedFigureId("42"), type)
    );
  });

  test("Figure position is at the first cell of the target", () => {
    selectFigure(model, figureId);
    copy(model);
    paste(model, "C3:C10, B8");
    const copiedFigure = model.getters.getFigure(sheetId, getCopiedFigureId())!;
    const figureUI = model.getters.getFigureUI(sheetId, copiedFigure);
    expect(figureUI.x).toEqual(2 * DEFAULT_CELL_WIDTH);
    expect(figureUI.y).toEqual(2 * DEFAULT_CELL_HEIGHT);
  });

  test("Figure size is copied", () => {
    updateFigure(model, {
      sheetId,
      figureId,
      height: 256,
      width: 257,
      col: 0,
      row: 0,
    });
    selectFigure(model, figureId);
    copy(model);
    paste(model, "A1");
    const copiedFigure = model.getters.getFigure(sheetId, getCopiedFigureId());
    expect(copiedFigure?.height).toEqual(256);
    expect(copiedFigure?.width).toEqual(257);
  });

  test("Can paste deleted %s", () => {
    const figureDef = getFigureDefinition(model, figureId, type);
    selectFigure(model, figureId);
    copy(model);
    deleteFigure(model, figureId, sheetId);
    paste(model, "A1");
    expect(getFigureDefinition(model, getCopiedFigureId(), type)).toEqual(figureDef);
  });

  test("Can cut paste %s on another sheet", () => {
    const figureDef = getFigureDefinition(model, figureId, type);
    selectFigure(model, figureId);
    cut(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");
    const newFigureId = model.getters.getFigures("42")[0].id;
    expect(getFigureDefinition(model, newFigureId, type)).toEqual(figureDef);
    expect(model.getters.getFigures(sheetId)).toHaveLength(0);
  });

  test("Figure is copied to edge of the sheet", () => {
    updateFigure(model, {
      sheetId,
      figureId,
      height: 256,
      width: 257,
      col: 0,
      row: 0,
    });
    selectFigure(model, figureId);
    copy(model);
    paste(model, "Z100");
    const copiedFigure = model.getters.getFigure(sheetId, getCopiedFigureId())!;
    const figureUI = model.getters.getFigureUI(sheetId, copiedFigure);
    const maxX = model.getters.getColDimensions(
      sheetId,
      model.getters.getNumberCols(sheetId) - 1
    ).end;
    const maxY = model.getters.getRowDimensions(
      sheetId,
      model.getters.getNumberRows(sheetId) - 1
    ).end;
    expect(figureUI.x).toBe(maxX - copiedFigure.width);
    expect(figureUI.y).toBe(maxY - copiedFigure.height);
  });

  test("Can paste a chart with ranges that were deleted between the copy and the paste", () => {
    const { model } = makeStore(ClipboardStore);
    createSheet(model, { sheetId: "sheet2Id", name: "Sheet2" });
    createChart(
      model,
      {
        type: "bar",
        ...toChartDataSource({
          dataSets: [
            { dataRange: "Sheet1!A1:A5", dataSetId: "0" },
            { dataRange: "Sheet2!B1:B5", dataSetId: "1" },
          ],
          labelRange: "B1",
        }),
      },
      "chartId",
      undefined,
      { figureId: "figureId" }
    );
    selectFigure(model, "figureId");
    copy(model);
    deleteSheet(model, "Sheet1");
    paste(model, "A1");
    expect(model.getters.getFigures("sheet2Id")).toHaveLength(1);
    const newChartId = model.getters.getChartIds("sheet2Id")[0];
    expect(model.getters.getChartDefinition(newChartId)).toMatchObject(
      toChartDataSource({
        dataSets: [{ dataRange: "B1:B5", dataSetId: "1" }],
        labelRange: undefined,
      })
    );
  });

  test("Chart clipboard content is not serialized at copy", async () => {
    selectFigure(model, figureId);
    copy(model);

    const clipboardSpreadsheetContent = await parseOSClipboardContent(
      await clipboardStore.getClipboardTextAndImageContent()
    );
    const clipboardData = clipboardSpreadsheetContent.data;
    expect(clipboardData?.figureId).toBe(undefined);
    expect(clipboardData?.copiedFigure).toBe(undefined);
    expect(clipboardData?.copiedChart).toBe(undefined);
  });

  describe("Paste command result", () => {
    test("Cannot paste with empty target", () => {
      selectFigure(model, figureId);
      copy(model);
      const result = clipboardStore.isCommandValid({ type: "PASTE", target: [] });
      expect(result).toBeCancelledBecause(CommandResult.EmptyTarget);
    });

    test("Cannot paste with clipboard options when pasting a figure", () => {
      selectFigure(model, figureId);
      copy(model);
      const result = clipboardStore.isCommandValid({
        type: "PASTE",
        target: target("A1"),
        pasteOption: "onlyFormat",
      });
      expect(result).toBeCancelledBecause(CommandResult.WrongFigurePasteOption);
    });
  });
});

describe("chart specific Clipboard test", () => {
  test("Can copy paste chart on another sheet", () => {
    const { model } = makeStore(ClipboardStore);
    const chartId = "thisIsAnId";
    createChart(model, { type: "bar" }, chartId);
    updateChart(
      model,
      chartId,
      toChartDataSource({ dataSets: [{ dataRange: "A1:A5" }], labelRange: "B1" })
    );
    const chartDef = model.getters.getChartDefinition(chartId);
    selectFigure(model, model.getters.getFigureIdFromChartId(chartId));
    copy(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");
    const newChartId = model.getters.getChartIds("42")[0];
    expect(model.getters.getChartDefinition(newChartId)).toEqual({
      ...chartDef,
      ...toChartDataSource({ dataSets: [{ dataRange: "Sheet1!A1:A5" }], labelRange: "Sheet1!B1" }),
    });
  });
});

describe("Carousel clipboard test", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    ({ model } = makeStore(ClipboardStore));
    sheetId = model.getters.getActiveSheetId();
  });

  test("Can copy/paste an empty carousel", () => {
    createCarousel(model, { items: [] }, "carouselId");
    selectFigure(model, "carouselId");
    copy(model);
    paste(model, "A1");
    expect(model.getters.getFigures(sheetId)).toHaveLength(2);
    const copiedFigure = model.getters.getFigures(sheetId)[1];

    expect(copiedFigure.tag).toBe("carousel");
    expect(copiedFigure.id).not.toBe("carouselId");
    expect(model.getters.getCarousel(copiedFigure.id).items).toEqual([]);
  });

  test("Can cut/paste an empty carousel", () => {
    createCarousel(model, { items: [] }, "carouselId");
    selectFigure(model, "carouselId");
    cut(model);
    paste(model, "A1");
    expect(model.getters.getFigures(sheetId)).toHaveLength(1);
    const copiedFigure = model.getters.getFigures(sheetId)[0];

    expect(copiedFigure.tag).toBe("carousel");
    expect(copiedFigure.id).not.toBe("carouselId");
    expect(model.getters.getCarousel(copiedFigure.id).items).toEqual([]);
  });

  test("Can copy/paste a carousel with charts", () => {
    createCarousel(model, { items: [] }, "carouselId");
    const chartId = addNewChartToCarousel(model, "carouselId", {
      type: "radar",
      ...toChartDataSource({ dataSets: [{ dataRange: "A1:A5" }] }),
    });
    const chartId2 = addNewChartToCarousel(model, "carouselId", {
      type: "bar",
      ...toChartDataSource({ labelRange: "B1", dataSets: [] }),
    });
    selectFigure(model, "carouselId");
    copy(model);
    paste(model, "A1");

    expect(model.getters.getFigures(sheetId)).toHaveLength(2);
    const copiedFigure = model.getters.getFigures(sheetId)[1];
    const copiedCarousel = model.getters.getCarousel(copiedFigure.id);

    expect(copiedCarousel.items).toEqual([
      { type: "chart", chartId: expect.not.stringMatching(chartId) },
      { type: "chart", chartId: expect.not.stringMatching(chartId2) },
    ]);
    expect(model.getters.getChartDefinition(copiedCarousel.items[0]["chartId"])).toMatchObject({
      type: "radar",
      ...toChartDataSource({ dataSets: [{ dataRange: "A1:A5" }] }),
    });
    expect(model.getters.getChartDefinition(copiedCarousel.items[1]["chartId"])).toMatchObject({
      type: "bar",
      ...toChartDataSource({ labelRange: "B1", dataSets: [] }),
    });
  });

  test("Can copy/paste a carousel with a chart to another sheet", () => {
    createCarousel(model, { items: [] }, "carouselId");
    addNewChartToCarousel(model, "carouselId", {
      type: "line",
      ...toChartDataSource({ dataSets: [{ dataRange: "A1:A5" }] }),
    });
    selectFigure(model, "carouselId");
    copy(model);
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    paste(model, "A1");

    expect(model.getters.getFigures("42")).toHaveLength(1);
    const copiedFigure = model.getters.getFigures("42")[0];
    const copiedCarousel = model.getters.getCarousel(copiedFigure.id);
    expect(model.getters.getChartDefinition(copiedCarousel.items[0]["chartId"])).toMatchObject({
      type: "line",
      ...toChartDataSource({ dataSets: [{ dataRange: "Sheet1!A1:A5" }] }),
    });
  });

  test("Can undo/redo a carousel copy/paste", () => {
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId");
    const chartId = addNewChartToCarousel(model, "carouselId", {
      type: "line",
      ...toChartDataSource({ dataSets: [{ dataRange: "A1:A5" }] }),
    });
    selectFigure(model, "carouselId");
    copy(model);
    paste(model, "A1");

    expect(model.getters.getFigures(sheetId)).toHaveLength(2);
    undo(model);
    expect(model.getters.getFigures(sheetId)).toHaveLength(1);
    redo(model);
    expect(model.getters.getFigures(sheetId)).toHaveLength(2);

    const copiedFigure = model.getters.getFigures(sheetId)[1];
    const copiedCarousel = model.getters.getCarousel(copiedFigure.id);
    expect(copiedCarousel.items).toEqual([
      { type: "carouselDataView" },
      { type: "chart", chartId: expect.not.stringMatching(chartId) },
    ]);
  });
});

describe("Paste into a carousel", () => {
  function createModelWithClipboard() {
    const { model } = makeStore(ClipboardStore);
    return { model, sheetId: model.getters.getActiveSheetId() };
  }

  test("Can paste a chart into the selected carousel", () => {
    const { model, sheetId } = createModelWithClipboard();
    createCarousel(model, { items: [] }, "carouselId");
    createChart(model, { type: "radar" }, "chartId", undefined, { figureId: "chartFigureId" });
    selectFigure(model, "chartFigureId");
    copy(model);
    selectFigure(model, "carouselId");
    paste(model, "A1");

    const items = model.getters.getCarousel("carouselId").items;
    expect(items).toEqual([{ type: "chart", chartId: expect.any(String) }]);
    expect(items[0]["chartId"]).not.toBe("chartId");
    expect(model.getters.getChartDefinition(items[0]["chartId"])).toMatchObject({ type: "radar" });
    expect(model.getters.getSelectedCarouselItem("carouselId")).toEqual(items[0]);
    expect(model.getters.getSelectedFigureIds()).toEqual(["carouselId"]);
    expect(getFigureIds(model, sheetId, "chart")).toEqual(["chartFigureId"]);
  });

  test("Can cut a chart and paste it into the selected carousel", () => {
    const { model, sheetId } = createModelWithClipboard();
    createCarousel(model, { items: [] }, "carouselId");
    createChart(model, { type: "radar" }, "chartId", undefined, { figureId: "chartFigureId" });
    selectFigure(model, "chartFigureId");
    cut(model);
    selectFigure(model, "carouselId");
    paste(model, "A1");

    const items = model.getters.getCarousel("carouselId").items;
    expect(items).toHaveLength(1);
    expect(model.getters.getChartDefinition(items[0]["chartId"])).toMatchObject({ type: "radar" });
    expect(getFigureIds(model, sheetId)).toEqual(["carouselId"]);
  });

  test("Can paste several charts into the selected carousel", () => {
    const { model } = createModelWithClipboard();
    createCarousel(model, { items: [] }, "carouselId");
    createChart(model, { type: "radar" }, "chartId1", undefined, { figureId: "figureId1" });
    createChart(model, { type: "bar" }, "chartId2", undefined, { figureId: "figureId2" });
    selectFigure(model, "figureId1");
    selectFigure(model, "figureId2", true);
    copy(model);
    selectFigure(model, "carouselId");
    paste(model, "A1");

    const items = model.getters.getCarousel("carouselId").items;
    expect(items).toHaveLength(2);
    const pastedTypes = items.map((item) => model.getters.getChartDefinition(item["chartId"]).type);
    expect(pastedTypes).toEqual(expect.arrayContaining(["radar", "bar"]));
    expect(model.getters.getSelectedFigureIds()).toEqual(["carouselId"]);
  });

  test("Pasting a chart on the selected chart merges both into a new carousel", () => {
    const { model, sheetId } = createModelWithClipboard();
    createChart(model, { type: "radar" }, "chartId1", undefined, { figureId: "figureId1" });
    createChart(model, { type: "bar" }, "chartId2", undefined, { figureId: "figureId2" });
    selectFigure(model, "figureId2");
    copy(model);
    selectFigure(model, "figureId1");
    paste(model, "A1");

    const carouselId = model.getters.getFigureIdFromChartId("chartId1");
    expect(model.getters.getFigure(sheetId, carouselId)?.tag).toBe("carousel");
    expect(getFigureIds(model, sheetId).sort()).toEqual([carouselId, "figureId2"].sort());
    const items = model.getters.getCarousel(carouselId).items;
    expect(items).toEqual([
      { type: "chart", chartId: "chartId1" },
      { type: "chart", chartId: expect.any(String) },
    ]);
    expect(model.getters.getChartDefinition(items[1]["chartId"])).toMatchObject({ type: "bar" });
    expect(model.getters.getSelectedCarouselItem(carouselId)).toEqual(items[1]);
    expect(model.getters.getSelectedFigureIds()).toEqual([carouselId]);
  });

  test("Pasting a chart on itself duplicates it instead of creating a carousel", () => {
    const { model, sheetId } = createModelWithClipboard();
    createChart(model, { type: "radar" }, "chartId", undefined, { figureId: "chartFigureId" });
    selectFigure(model, "chartFigureId");
    copy(model);
    paste(model, "A1");

    expect(getFigureIds(model, sheetId, "carousel")).toHaveLength(0);
    expect(getFigureIds(model, sheetId, "chart")).toHaveLength(2);
  });

  test("Pasting an image while a carousel is selected pastes it on the sheet", () => {
    const { model, sheetId } = createModelWithClipboard();
    createCarousel(model, { items: [] }, "carouselId");
    createImage(model, { figureId: "imageId" });
    selectFigure(model, "imageId");
    copy(model);
    selectFigure(model, "carouselId");
    paste(model, "A1");

    expect(model.getters.getCarousel("carouselId").items).toEqual([]);
    expect(getFigureIds(model, sheetId, "image")).toHaveLength(2);
  });

  test("Pasting a carousel while another carousel is selected pastes it on the sheet", () => {
    const { model, sheetId } = createModelWithClipboard();
    createCarousel(model, { items: [] }, "carouselId1");
    createCarousel(model, { items: [{ type: "carouselDataView" }] }, "carouselId2");
    selectFigure(model, "carouselId2");
    copy(model);
    selectFigure(model, "carouselId1");
    paste(model, "A1");

    expect(model.getters.getCarousel("carouselId1").items).toEqual([]);
    expect(getFigureIds(model, sheetId, "carousel")).toHaveLength(3);
  });

  test("Can paste a range into the selected carousel as a data view", () => {
    const { model, sheetId } = createModelWithClipboard();
    createCarousel(model, { items: [] }, "carouselId");
    setCellContent(model, "A1", "1");
    copy(model, "A1:B2");
    selectFigure(model, "carouselId");
    paste(model, "C3");

    const items = model.getters.getCarousel("carouselId").items;
    expect(items).toMatchObject([
      { type: "carouselDataView", range: { sheetId, zone: toZone("A1:B2") } },
    ]);
    expect(model.getters.getSelectedCarouselItem("carouselId")).toEqual(items[0]);
    expect(model.getters.getSelectedFigureIds()).toEqual(["carouselId"]);
    expect(getCellContent(model, "C3")).toBe("");
  });

  test("Can paste a range from another sheet into the selected carousel", () => {
    const { model, sheetId } = createModelWithClipboard();
    createSheet(model, { sheetId: "sheet2" });
    copy(model, "A1:B2");
    activateSheet(model, "sheet2");
    createCarousel(model, { items: [] }, "carouselId", "sheet2");
    selectFigure(model, "carouselId");
    paste(model, "A1");

    expect(model.getters.getCarousel("carouselId").items).toMatchObject([
      { type: "carouselDataView", range: { sheetId, zone: toZone("A1:B2") } },
    ]);
  });

  test("Pasting a range on the selected chart merges it with a data view into a new carousel", () => {
    const { model, sheetId } = createModelWithClipboard();
    createChart(model, { type: "bar" }, "chartId", undefined, { figureId: "chartFigureId" });
    copy(model, "A1:B2");
    selectFigure(model, "chartFigureId");
    paste(model, "C3");

    const carouselId = model.getters.getFigureIdFromChartId("chartId");
    expect(getFigureIds(model, sheetId)).toEqual([carouselId]);
    expect(model.getters.getFigure(sheetId, carouselId)?.tag).toBe("carousel");
    expect(model.getters.getCarousel(carouselId).items).toMatchObject([
      { type: "chart", chartId: "chartId" },
      { type: "carouselDataView", range: { zone: toZone("A1:B2") } },
    ]);
    expect(model.getters.getSelectedFigureIds()).toEqual([carouselId]);
  });

  test("Pasting a range into a carousel is undone in one step", () => {
    const { model } = createModelWithClipboard();
    createCarousel(model, { items: [] }, "carouselId");
    copy(model, "A1:B2");
    selectFigure(model, "carouselId");
    paste(model, "C3");
    expect(model.getters.getCarousel("carouselId").items).toHaveLength(1);

    undo(model);
    expect(model.getters.getCarousel("carouselId").items).toEqual([]);
  });

  test("Pasting a chart on a chart is undone in one step", () => {
    const { model, sheetId } = createModelWithClipboard();
    createChart(model, { type: "radar" }, "chartId1", undefined, { figureId: "figureId1" });
    createChart(model, { type: "bar" }, "chartId2", undefined, { figureId: "figureId2" });
    selectFigure(model, "figureId2");
    copy(model);
    selectFigure(model, "figureId1");
    paste(model, "A1");

    undo(model);
    expect(getFigureIds(model, sheetId).sort()).toEqual(["figureId1", "figureId2"]);
    expect(getFigureIds(model, sheetId, "carousel")).toHaveLength(0);
  });
});
