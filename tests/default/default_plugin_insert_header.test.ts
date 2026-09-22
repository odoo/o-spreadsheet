import { Model } from "../../src";
import { addColumns, addRows, setCellContent, setFormat, setFormatting } from "../test_helpers";
import { getCellContent, getStyle } from "../test_helpers/getters_helpers";

describe("inserting a header next to a header holding a default", () => {
  test("the style copied from the reference column is kept", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    setFormatting(model, "A1", { bold: true });
    // the bold of the inserted column comes from A1, not from the default of the
    // column previously sitting at that index
    setFormatting(model, "B1:B100", { bold: true });

    addColumns(model, "after", "A", 1);

    expect(getStyle(model, "B1")).toMatchObject({ bold: true });
  });

  test("the format copied from the reference column is kept", () => {
    const model = new Model();
    setCellContent(model, "A1", "1");
    setFormat(model, "A1", "0.00%");
    setFormat(model, "B1:B100", "0.00%");

    addColumns(model, "after", "A", 1);
    setCellContent(model, "B1", "1");

    expect(getCellContent(model, "B1")).toBe("100.00%");
  });

  test("the style copied from the reference row is kept", () => {
    const model = new Model();
    setCellContent(model, "A1", "hello");
    setFormatting(model, "A1", { bold: true });
    setFormatting(model, "A2:Z2", { bold: true });

    addRows(model, "after", 0, 1);

    expect(getStyle(model, "A2")).toMatchObject({ bold: true });
  });
});
