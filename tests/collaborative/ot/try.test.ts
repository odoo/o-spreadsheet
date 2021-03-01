import {
  DeleteContentCommand,
  DeleteSheetCommand,
  RemoveRowsCommand,
  UpdateCellCommand,
} from "../../../src/types";
import { tryTransform } from "../../../src/types/collaborative/ot_types";
import { target } from "../../test_helpers/helpers";

describe("Try", () => {
  test("1", () => {
    const cmd: UpdateCellCommand = {
      type: "UPDATE_CELL",
      col: 1,
      row: 1,
      content: "hello",
      sheetId: "42",
    };
    const deleteSheet: DeleteSheetCommand = {
      type: "DELETE_SHEET",
      sheetId: "42",
    };
    expect(tryTransform(cmd, deleteSheet)).toBeUndefined();
    expect(tryTransform(cmd, { ...deleteSheet, sheetId: "44" })).toEqual(cmd);
    const deleteContent: DeleteContentCommand = {
      type: "DELETE_CONTENT",
      sheetId: "42",
      target: target("A1:B2"),
    };
    const deleteRow: RemoveRowsCommand = {
      type: "REMOVE_ROWS",
      sheetId: "42",
      rows: [0],
    };
    expect(tryTransform(deleteContent, deleteRow)).toEqual({
      ...deleteContent,
      target: target("A1:B1"),
    });
    expect(tryTransform(deleteContent, { ...deleteRow, sheetId: "44" })).toEqual(deleteContent);
    expect(tryTransform({ ...deleteContent, target: target("A4") }, deleteRow)).toEqual({
      ...deleteContent,
      target: target("A3"),
    });
    expect(tryTransform({ ...deleteContent, target: target("A1:Z1") }, deleteRow)).toBeUndefined();
  });
});
