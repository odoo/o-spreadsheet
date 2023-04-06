import { Model } from "../../../src";
import { createEmptyWorkbookData } from "../../../src/migrations/data";
import { FileStore } from "../../__mocks__/mock_file_store";

describe("image file store", () => {
  test("created image is not deleted from file store", () => {
    const fileStore = new FileStore();
    fileStore.delete = jest.fn();
    const data = createEmptyWorkbookData();
    const size = { width: 100, height: 100 };
    new Model(
      data,
      {
        external: { fileStore },
        snapshotRequested: true,
      },
      [
        {
          type: "REMOTE_REVISION",
          clientId: "42",
          serverRevisionId: data.revisionId,
          nextRevisionId: "2",
          version: 1,
          commands: [
            {
              type: "CREATE_IMAGE",
              definition: { path: "/image/1", size, mimetype: "image/jpeg" },
              figureId: "figureId",
              position: { x: 0, y: 0 },
              sheetId: data.sheets[0].id,
              size,
            },
          ],
        },
      ]
    );
    expect(fileStore.delete).not.toHaveBeenCalled();
  });

  test("deleted image is deleted from file store", () => {
    const fileStore = new FileStore();
    fileStore.delete = jest.fn();
    const data = createEmptyWorkbookData();
    const sheetId = data.sheets[0].id;
    const size = { width: 100, height: 100 };
    new Model(
      data,
      {
        external: { fileStore },
        snapshotRequested: true,
      },
      [
        {
          type: "REMOTE_REVISION",
          clientId: "42",
          serverRevisionId: data.revisionId,
          nextRevisionId: "2",
          version: 1,
          commands: [
            {
              type: "CREATE_IMAGE",
              definition: { path: "/image/1", size, mimetype: "image/jpeg" },
              figureId: "figureId",
              position: { x: 0, y: 0 },
              sheetId,
              size,
            },
            { type: "DELETE_FIGURE", id: "figureId", sheetId },
          ],
        },
      ]
    );
    expect(fileStore.delete).toHaveBeenCalledWith("/image/1");
  });

  test("undo image is deleted from file store", () => {
    const fileStore = new FileStore();
    fileStore.delete = jest.fn();
    const data = createEmptyWorkbookData();
    const sheetId = data.sheets[0].id;
    const size = { width: 100, height: 100 };
    new Model(
      data,
      {
        external: { fileStore },
        snapshotRequested: true,
      },
      [
        {
          type: "REMOTE_REVISION",
          clientId: "42",
          serverRevisionId: data.revisionId,
          nextRevisionId: "2",
          version: 1,
          commands: [
            {
              type: "CREATE_IMAGE",
              definition: { path: "/image/1", size, mimetype: "image/jpeg" },
              figureId: "figureId",
              position: { x: 0, y: 0 },
              sheetId,
              size,
            },
          ],
        },
        {
          type: "REVISION_UNDONE",
          serverRevisionId: "2",
          nextRevisionId: "3",
          undoneRevisionId: "2",
          version: 1,
        },
      ]
    );
    expect(fileStore.delete).toHaveBeenCalledWith("/image/1");
  });

  test("undo/redo image is not deleted from file store", () => {
    const fileStore = new FileStore();
    fileStore.delete = jest.fn();
    const data = createEmptyWorkbookData();
    const sheetId = data.sheets[0].id;
    const size = { width: 100, height: 100 };
    new Model(
      data,
      {
        external: { fileStore },
        snapshotRequested: true,
      },
      [
        {
          type: "REMOTE_REVISION",
          clientId: "42",
          serverRevisionId: data.revisionId,
          nextRevisionId: "2",
          version: 1,
          commands: [
            {
              type: "CREATE_IMAGE",
              definition: { path: "/image/1", size, mimetype: "image/jpeg" },
              figureId: "figureId",
              position: { x: 0, y: 0 },
              sheetId,
              size,
            },
          ],
        },
        {
          type: "REVISION_UNDONE",
          serverRevisionId: "2",
          nextRevisionId: "3",
          undoneRevisionId: "2",
          version: 1,
        },
        {
          type: "REVISION_REDONE",
          serverRevisionId: "3",
          nextRevisionId: "4",
          redoneRevisionId: "2",
          version: 1,
        },
      ]
    );
    expect(fileStore.delete).not.toHaveBeenCalled();
  });

  test("deleted copied image is not deleted from file store", () => {
    const fileStore = new FileStore();
    fileStore.delete = jest.fn();
    const data = createEmptyWorkbookData();
    const sheetId = data.sheets[0].id;
    const size = { width: 100, height: 100 };
    new Model(
      data,
      {
        external: { fileStore },
        snapshotRequested: true,
      },
      [
        {
          type: "REMOTE_REVISION",
          clientId: "42",
          serverRevisionId: data.revisionId,
          nextRevisionId: "2",
          version: 1,
          commands: [
            {
              type: "CREATE_IMAGE",
              definition: { path: "/image/1", size, mimetype: "image/jpeg" },
              figureId: "figure_1",
              position: { x: 0, y: 0 },
              sheetId,
              size,
            },
            {
              type: "CREATE_IMAGE",
              definition: { path: "/image/1", size },
              figureId: "figure_2",
              position: { x: 0, y: 0 },
              sheetId,
              size,
            },
            { type: "DELETE_FIGURE", id: "figure_1", sheetId },
          ],
        },
      ]
    );
    expect(fileStore.delete).not.toHaveBeenCalled();
  });

  test("deleting sheet deletes image from file store", () => {
    const fileStore = new FileStore();
    fileStore.delete = jest.fn();
    const data = createEmptyWorkbookData();
    const size = { width: 100, height: 100 };
    new Model(
      data,
      {
        external: { fileStore },
        snapshotRequested: true,
      },
      [
        {
          type: "REMOTE_REVISION",
          clientId: "42",
          serverRevisionId: data.revisionId,
          nextRevisionId: "2",
          version: 1,
          commands: [
            { type: "CREATE_SHEET", position: 1, sheetId: "sheet_2" },
            {
              type: "CREATE_IMAGE",
              definition: { path: "/image/1", size, mimetype: "image/jpeg" },
              figureId: "figureId",
              position: { x: 0, y: 0 },
              sheetId: "sheet_2",
              size,
            },
            { type: "DELETE_SHEET", sheetId: "sheet_2" },
          ],
        },
      ]
    );
    expect(fileStore.delete).toHaveBeenCalledWith("/image/1");
  });

  test("undo sheet creation deletes image from file store", () => {
    const fileStore = new FileStore();
    fileStore.delete = jest.fn();
    const data = createEmptyWorkbookData();
    const size = { width: 100, height: 100 };
    new Model(
      data,
      {
        external: { fileStore },
        snapshotRequested: true,
      },
      [
        {
          type: "REMOTE_REVISION",
          clientId: "42",
          serverRevisionId: data.revisionId,
          nextRevisionId: "2",
          version: 1,
          commands: [
            { type: "CREATE_SHEET", position: 1, sheetId: "sheet_2" },
            {
              type: "CREATE_IMAGE",
              definition: { path: "/image/1", size, mimetype: "image/jpeg" },
              figureId: "figureId",
              position: { x: 0, y: 0 },
              sheetId: "sheet_2",
              size,
            },
          ],
        },
        {
          type: "REVISION_UNDONE",
          serverRevisionId: "2",
          nextRevisionId: "3",
          undoneRevisionId: "2",
          version: 1,
        },
      ]
    );
    expect(fileStore.delete).toHaveBeenCalledWith("/image/1");
  });

  test("delete snapshotted image", () => {
    const fileStore = new FileStore();
    fileStore.delete = jest.fn();
    const data = createEmptyWorkbookData();
    const sheetId = data.sheets[0].id;
    data.sheets[0].figures = [
      {
        id: "imageId",
        tag: "image",
        height: 380,
        width: 380,
        x: 0,
        y: 0,
        data: {
          path: "/image/1",
          size: { width: 100, height: 100 },
          mimetype: "image/jpeg",
        },
      },
    ];
    new Model(
      data,
      {
        external: { fileStore },
        snapshotRequested: true,
      },
      [
        {
          type: "REMOTE_REVISION",
          clientId: "42",
          serverRevisionId: data.revisionId,
          nextRevisionId: "2",
          version: 1,
          commands: [{ type: "DELETE_FIGURE", id: "imageId", sheetId }],
        },
      ]
    );
    expect(fileStore.delete).toHaveBeenCalledWith("/image/1");
  });
});
