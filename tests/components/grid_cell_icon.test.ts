import { Component, xml } from "@odoo/owl";
import { Model } from "../../src";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../src/constants";
import { SpreadsheetChildEnv, UID } from "../../src/types";
import { merge, resizeColumns, resizeRows, setStyle } from "../test_helpers/commands_helpers";
import { getStylePropertyInPx, mountComponent } from "../test_helpers/helpers";
import {
  GridCellIcon,
  GridCellIconProps,
} from "./../../src/components/grid_cell_icon/grid_cell_icon";

class ParentComponent extends Component<{}, SpreadsheetChildEnv> {
  static components = { GridCellIcon };
  static template = xml/* xml */ `
    <GridCellIcon t-props="this.props">
      <div class="my-icon"></div>
    </GridCellIcon>
  `;
}

describe("Grid cell icon component", () => {
  let model: Model;
  let sheetId: UID;
  let icon: HTMLElement;
  let fixture: HTMLElement;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  async function mountGridIcon(partialProps: Partial<GridCellIconProps>) {
    const props: GridCellIconProps = {
      cellPosition: { sheetId, col: 1, row: 1 },
      offset: { x: HEADER_WIDTH, y: HEADER_HEIGHT },
      ...partialProps,
    };

    ({ fixture } = await mountComponent(ParentComponent, { model, props }));
    icon = fixture.querySelector(".o-grid-cell-icon") as HTMLElement;
  }

  test("Component in t-slot is rendered", async () => {
    await mountGridIcon({});
    expect(fixture.querySelector(".my-icon")).toBeTruthy();
  });

  test("Horizontal alignment left", async () => {
    resizeColumns(model, ["B"], 200);
    await mountGridIcon({ cellPosition: { sheetId, col: 1, row: 1 }, horizontalAlign: "left" });
    const colDims = model.getters.getColDimensionsInViewport(sheetId, 1);
    const left = colDims.start + GRID_ICON_MARGIN + HEADER_WIDTH;
    expect(getStylePropertyInPx(icon, "left")).toEqual(left);
  });

  test("Horizontal alignment center", async () => {
    resizeColumns(model, ["B"], 200);
    await mountGridIcon({ cellPosition: { sheetId, col: 1, row: 1 }, horizontalAlign: "center" });
    const colDims = model.getters.getColDimensionsInViewport(sheetId, 1);
    const centeringOffset = Math.floor((colDims.size - GRID_ICON_EDGE_LENGTH) / 2);
    const center = colDims.end - GRID_ICON_EDGE_LENGTH - centeringOffset + HEADER_WIDTH;
    expect(getStylePropertyInPx(icon, "left")).toEqual(center);
  });

  test("Horizontal alignment right", async () => {
    resizeColumns(model, ["B"], 200);
    await mountGridIcon({ cellPosition: { sheetId, col: 1, row: 1 }, horizontalAlign: "right" });
    const colDims = model.getters.getColDimensionsInViewport(sheetId, 1);
    const right = colDims.end - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH + HEADER_WIDTH;
    expect(getStylePropertyInPx(icon, "left")).toEqual(right);
  });

  test("Vertical alignment top", async () => {
    resizeRows(model, [1], 200);
    await mountGridIcon({ cellPosition: { sheetId, col: 1, row: 1 }, verticalAlign: "top" });
    const rowDims = model.getters.getRowDimensionsInViewport(sheetId, 1);
    const top = rowDims.start + GRID_ICON_MARGIN + HEADER_HEIGHT;
    expect(getStylePropertyInPx(icon, "top")).toEqual(top);
  });

  test("Vertical alignment middle", async () => {
    resizeRows(model, [1], 200);
    await mountGridIcon({ cellPosition: { sheetId, col: 1, row: 1 }, verticalAlign: "middle" });
    const rowDims = model.getters.getRowDimensionsInViewport(sheetId, 1);
    const centeringOffset = Math.floor((rowDims.size - GRID_ICON_EDGE_LENGTH) / 2);
    const middle = rowDims.end - GRID_ICON_EDGE_LENGTH - centeringOffset + HEADER_HEIGHT;
    expect(getStylePropertyInPx(icon, "top")).toEqual(middle);
  });

  test("Vertical alignment bottom", async () => {
    resizeRows(model, [1], 200);
    await mountGridIcon({ cellPosition: { sheetId, col: 1, row: 1 }, verticalAlign: "bottom" });
    const rowDims = model.getters.getRowDimensionsInViewport(sheetId, 1);
    const bottom = rowDims.end - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH + HEADER_HEIGHT;
    expect(bottom).toEqual(getStylePropertyInPx(icon, "top"));
  });

  test("props alignment have the priority over cell align", async () => {
    resizeRows(model, [1], 200);
    resizeColumns(model, ["B"], 200);
    const rowDims = model.getters.getRowDimensionsInViewport(sheetId, 1);
    const colDims = model.getters.getColDimensionsInViewport(sheetId, 1);

    setStyle(model, "B2", { align: "right", verticalAlign: "bottom" });
    await mountGridIcon({
      cellPosition: { sheetId, col: 1, row: 1 },
      verticalAlign: "top",
      horizontalAlign: "left",
    });

    const top = rowDims.start + GRID_ICON_MARGIN + HEADER_HEIGHT;
    const left = colDims.start + GRID_ICON_MARGIN + HEADER_WIDTH;
    expect(getStylePropertyInPx(icon, "top")).toEqual(top);
    expect(getStylePropertyInPx(icon, "left")).toEqual(left);
  });

  test("Merged cells are taken into account", async () => {
    merge(model, "A1:B2");
    await mountGridIcon({
      cellPosition: { sheetId, col: 0, row: 0 },
      horizontalAlign: "right",
      verticalAlign: "bottom",
    });

    const top = 2 * DEFAULT_CELL_HEIGHT - GRID_ICON_EDGE_LENGTH - GRID_ICON_MARGIN + HEADER_HEIGHT;
    expect(getStylePropertyInPx(icon, "top")).toEqual(top);

    const left = 2 * DEFAULT_CELL_WIDTH - GRID_ICON_EDGE_LENGTH - GRID_ICON_MARGIN + HEADER_WIDTH;
    expect(getStylePropertyInPx(icon, "left")).toEqual(left);
  });
});
