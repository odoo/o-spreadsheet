import { Model } from "../../../src";
import { FIGURE_ID_SPLITTER } from "../../../src/constants";
import { createImage, paste, redo, undo } from "../../test_helpers/commands_helpers";
import { getFigureIds } from "../../test_helpers/helpers";

describe("image plugin", function () {
  test("create image", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const imageId = "Image1";
    const definition = {
      sheetId,
      path: "image path",
      size: { width: 100, height: 100 },
      mimetype: "image/jpeg",
    };
    createImage(model, { figureId: imageId, definition });
    expect(model.getters.getImage(imageId)).toEqual(definition);
  });

  test("delete image", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const imageId = "Image1";
    createImage(model, { sheetId: sheetId, figureId: imageId });
    model.dispatch("DELETE_FIGURE", { sheetId, id: imageId });
    const images = getFigureIds(model, sheetId);
    expect(images).toHaveLength(0);
  });

  test("copy paste image", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const imageId = "Image1";
    const definition = {
      sheetId,
      path: "image path",
      size: { width: 100, height: 100 },
      mimetype: "image/jpeg",
    };
    createImage(model, { figureId: imageId, definition });
    model.dispatch("SELECT_FIGURE", { id: imageId });
    model.dispatch("COPY");
    paste(model, "D4");
    const images = getFigureIds(model, sheetId);
    expect(images).toHaveLength(2);
    for (const nextImageId of images) {
      expect(model.getters.getImage(nextImageId)).toEqual(definition);
    }
  });

  test("cut past image", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const imageId = "Image1";
    const definition = {
      sheetId,
      path: "image path",
      size: { width: 100, height: 100 },
      mimetype: "image/jpeg",
    };
    createImage(model, { figureId: imageId, definition });
    model.dispatch("SELECT_FIGURE", { id: imageId });
    model.dispatch("CUT");
    paste(model, "D4");
    const images = getFigureIds(model, sheetId);
    expect(images).toHaveLength(1);
    const image = model.getters.getImage(images[0]);
    expect(image).toEqual(definition);
  });
});

describe("test image in sheet", function () {
  test("duplicate sheet image", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const imageId = "Image1";
    createImage(model, { sheetId: sheetId, figureId: imageId });
    const newSheetId = "Sheet2";
    model.dispatch("DUPLICATE_SHEET", { sheetId, sheetIdTo: newSheetId });
    const original = model.getters.getImage(imageId);
    const newImages = getFigureIds(model, newSheetId);
    expect(newImages).toHaveLength(1);
    const copy = model.getters.getImage(newImages[0]);
    expect(copy).not.toBe(original);
  });

  test("delete a sheet with an image", () => {
    const model = new Model();
    const imageId = "Image1";
    const newSheetId = "Sheet2";
    model.dispatch("CREATE_SHEET", { sheetId: newSheetId, position: 2 });
    createImage(model, { sheetId: newSheetId, figureId: imageId });
    model.dispatch("DELETE_SHEET", { sheetId: newSheetId });
    const images = getFigureIds(model, newSheetId);
    expect(images).toHaveLength(0);
  });

  test("Duplicate sheet > export > import > duplicate sheet contains 2 distinct charts", () => {
    const model = new Model();
    const firstSheetId = model.getters.getActiveSheetId();
    const secondSheetId = "42";
    const thirdSheetId = "third";
    createImage(model, { sheetId: firstSheetId, figureId: "myImage" });
    model.dispatch("DUPLICATE_SHEET", {
      sheetId: firstSheetId,
      sheetIdTo: secondSheetId,
    });
    const newModel = new Model(model.exportData());
    newModel.dispatch("DUPLICATE_SHEET", {
      sheetId: secondSheetId,
      sheetIdTo: thirdSheetId,
    });

    const figuresSh1 = newModel.getters.getFigures(firstSheetId);
    const figuresSh2 = newModel.getters.getFigures(secondSheetId);
    const figuresSh3 = newModel.getters.getFigures(thirdSheetId);

    expect(figuresSh1.length).toEqual(1);
    expect(figuresSh2.length).toEqual(1);
    expect(figuresSh3.length).toEqual(1);

    expect(figuresSh1[0].id).toEqual("myImage");
    expect(figuresSh2[0].id).toEqual(secondSheetId + FIGURE_ID_SPLITTER + "myImage");
    expect(figuresSh3[0].id).toEqual(thirdSheetId + FIGURE_ID_SPLITTER + "myImage");

    const imageSh1 = newModel.getters.getImage(figuresSh1[0].id);
    const imageSh2 = newModel.getters.getImage(figuresSh2[0].id);
    const imageSh3 = newModel.getters.getImage(figuresSh3[0].id);

    expect(imageSh1).not.toBe(imageSh2);
    expect(imageSh2).not.toBe(imageSh3);
    expect(imageSh3).not.toBe(imageSh1);
  });
});

describe("test image import & export", function () {
  test("can export an image", () => {
    const model = new Model();
    const imageId = "Image1";
    createImage(model, { sheetId: "Sheet1", figureId: imageId });
    const data = model.exportData();
    const activeSheetId = model.getters.getActiveSheetId();
    const sheet = data.sheets.find((s) => s.id === activeSheetId)!;
    expect(sheet.figures).toEqual([
      {
        id: imageId,
        tag: "image",
        height: 380,
        width: 380,
        x: 0,
        y: 0,
        data: model.getters.getImage(imageId),
      },
    ]);
  });
  test("can import an image", () => {
    const model = new Model();
    const sheetId = "Sheet1";
    const imageId = "Image1";
    createImage(model, { sheetId, figureId: imageId });
    const importedData = model.exportData();
    const newModel = new Model(importedData);
    expect(newModel.getters.getImage(imageId)).toEqual(model.getters.getImage(imageId));
    expect(newModel.getters.getFigure(sheetId, imageId)).toEqual(
      model.getters.getFigure(sheetId, imageId)
    );
  });
});

describe("test image undo/redo", () => {
  test("undo/redo image creation", () => {
    const model = new Model();
    const before = model.exportData();
    createImage(model, {});
    const after = model.exportData();
    undo(model);
    expect(model).toExport(before);
    redo(model);
    expect(model).toExport(after);
  });
  test("undo/redo image deletion", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const imageId = "Image1";
    createImage(model, { sheetId, figureId: imageId });
    const before = model.exportData();
    model.dispatch("DELETE_FIGURE", { sheetId, id: imageId });
    const after = model.exportData();
    undo(model);
    expect(model).toExport(before);
    redo(model);
    expect(model).toExport(after);
  });

  test("undo/redo image cut & paste", () => {
    const model = new Model();
    const imageId = "Image1";
    createImage(model, { figureId: imageId });
    const before = model.exportData();
    model.dispatch("SELECT_FIGURE", { id: imageId });
    model.dispatch("CUT");
    paste(model, "D4");
    const after = model.exportData();
    undo(model);
    expect(model).toExport(before);
    redo(model);
    expect(model).toExport(after);
  });

  test("undo/redo duplicate sheet", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const imageId = "Image1";
    createImage(model, { sheetId, figureId: imageId });
    const before = model.exportData();
    const newSheetId = "Sheet2";
    model.dispatch("DUPLICATE_SHEET", { sheetId, sheetIdTo: newSheetId });
    const after = model.exportData();
    undo(model);
    expect(model).toExport(before);
    redo(model);
    expect(model).toExport(after);
  });
});
