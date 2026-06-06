import { RegionFormulaCell } from "../../src/helpers/cells/cell_evaluation";
import { Model } from "../../src/model";
import { addRows, getCellContent, getEvaluatedCell, setCellContent } from "../test_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";

/**
 * A "fill region" is a vertical run of identical translated formulas. When such
 * a run is squished into a single range key (e.g. "B2:B20"), it is imported as
 * lightweight flyweight cells sharing one compiled template instead of one
 * compiled formula per cell. These tests check that the optimization engages and
 * that region cells behave exactly like ordinary formula cells.
 */
function squishedFillColumn(rows: number): Model {
  const grid: Record<string, string> = {};
  for (let r = 1; r <= rows; r++) {
    grid[`A${r}`] = `${r}`;
    grid[`B${r}`] = `=A${r}+1`;
  }
  return new Model(createModelFromGrid(grid)._exportData(true));
}

test("an imported fill-down run is stored as flyweight region cells", () => {
  const model = squishedFillColumn(20);
  const sheetId = model.getters.getActiveSheetId();
  // The B2:B20 run shares a template; only the anchor B1 is a plain cell.
  let regionCells = 0;
  for (let r = 1; r <= 20; r++) {
    if (model.getters.getCell({ sheetId, col: 1, row: r - 1 }) instanceof RegionFormulaCell) {
      regionCells++;
    }
  }
  expect(regionCells).toBe(19);
});

test("region cells evaluate and stringify like normal formula cells", () => {
  const model = squishedFillColumn(20);
  for (let r = 1; r <= 20; r++) {
    expect(getEvaluatedCell(model, `B${r}`).value).toBe(r + 1);
    expect(getCellContent(model, `B${r}`)).toBe(`${r + 1}`);
  }
});

test("a squished fill region round-trips to the same full export", () => {
  const grid: Record<string, string> = {};
  for (let r = 1; r <= 20; r++) {
    grid[`A${r}`] = `${r}`;
    grid[`B${r}`] = `=A${r}+1`;
  }
  const source = createModelFromGrid(grid);
  const fullExport = source._exportData(false);
  const reimported = new Model(source._exportData(true));
  expect(reimported._exportData(false)).toEqual(fullExport);
});

test("inserting a row inside a region dissolves it and keeps formulas correct", () => {
  const model = squishedFillColumn(20);

  addRows(model, "before", 9, 1); // insert before row 10 (0-indexed 9)

  // the formula previously at B10 (=A10+1) is now at B11 (=A11+1)
  expect(getEvaluatedCell(model, "B11").value).toBe(11);
  expect(getCellContent(model, "B11")).toBe("11");
  // the inserted row is empty
  expect(getCellContent(model, "B10")).toBe("");
  // cells above the insertion are untouched
  expect(getEvaluatedCell(model, "B5").value).toBe(6);
});

test("changing a dependency re-evaluates the region cell that depends on it", () => {
  const model = squishedFillColumn(20);

  // B10 = A10 + 1 ; changing A10 must dirty B10 through the region dependency graph
  setCellContent(model, "A10", "999");

  expect(getEvaluatedCell(model, "B10").value).toBe(1000);
  // unrelated region cells are unchanged
  expect(getEvaluatedCell(model, "B9").value).toBe(10);
  expect(getEvaluatedCell(model, "B11").value).toBe(12);
});

test("a region whose dependency is a range tracks changes to any cell of the range", () => {
  const grid: Record<string, string> = {};
  for (let r = 1; r <= 10; r++) {
    grid[`A${r}`] = `${r}`;
    grid[`B${r}`] = `${r * 10}`;
    grid[`C${r}`] = `=SUM(A${r}:B${r})`; // fill region with a range dependency
  }
  const model = new Model(createModelFromGrid(grid)._exportData(true));

  expect(getEvaluatedCell(model, "C5").value).toBe(55); // 5 + 50

  setCellContent(model, "B5", "500");
  expect(getEvaluatedCell(model, "C5").value).toBe(505); // 5 + 500
  expect(getEvaluatedCell(model, "C6").value).toBe(66); // untouched
});

test("editing a single cell of a region leaves the others intact", () => {
  const model = squishedFillColumn(20);

  setCellContent(model, "B5", "=A5+100");

  expect(getEvaluatedCell(model, "B5").value).toBe(105);
  // neighbours still evaluate from the (now dissolved) template
  expect(getEvaluatedCell(model, "B4").value).toBe(5);
  expect(getEvaluatedCell(model, "B6").value).toBe(7);
});
