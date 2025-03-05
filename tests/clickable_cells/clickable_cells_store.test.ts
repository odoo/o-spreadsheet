import { ClickableCellsStore } from "../../src/components/dashboard/clickable_cell_store";
import { positionToZone, toZone } from "../../src/helpers";
import { clickableCellRegistry } from "../../src/registries/cell_clickable_registry";
import { setCellContent } from "../test_helpers/commands_helpers";
import { addToRegistry } from "../test_helpers/helpers";
import { makeStore } from "../test_helpers/stores";

describe("clickable cells store", () => {
  test("is conditionally created", () => {
    addToRegistry(clickableCellRegistry, "test", {
      condition(position, getters) {
        return !!getters.getCell(position)?.isFormula;
      },
      execute() {},
      sequence: 1,
    });
    const { store, model } = makeStore(ClickableCellsStore);

    expect(store.clickableCells).toHaveLength(0);
    setCellContent(model, "A1", "=1+1");
    expect(store.clickableCells).toHaveLength(1);
  });

  test("can have a hover style", () => {
    addToRegistry(clickableCellRegistry, "test", {
      condition(position, getters) {
        return true;
      },
      execute() {},
      hoverStyle(position, getters) {
        return [
          {
            zone: positionToZone(position),
            style: {
              fillColor: "#0000FF",
            },
          },
        ];
      },
      sequence: 1,
    });
    const { store, model } = makeStore(ClickableCellsStore);
    expect(store.hoverStyles.keys()).toHaveLength(0);
    store.hoverClickableCell({ col: 0, row: 0 });
    expect(store.hoverStyles.keys()).toHaveLength(1);
    const sheetId = model.getters.getActiveSheetId();
    expect(store.hoverStyles.get({ sheetId, col: 0, row: 0 })).toEqual({ fillColor: "#0000FF" });

    store.hoverClickableCell({ col: undefined, row: undefined });
    expect(store.hoverStyles.keys()).toHaveLength(0);
  });

  test("can have different hover styles on different zones", () => {
    addToRegistry(clickableCellRegistry, "test", {
      condition(position, getters) {
        return true;
      },
      execute() {},
      hoverStyle(position, getters) {
        return [
          {
            zone: toZone("A1:B1"),
            style: {
              fillColor: "#0000FF",
            },
          },
          {
            zone: toZone("A1"),
            style: {
              textColor: "#00FF00",
            },
          },
        ];
      },
      sequence: 1,
    });
    const { store, model } = makeStore(ClickableCellsStore);
    expect(store.hoverStyles.keys()).toHaveLength(0);
    store.hoverClickableCell({ col: 0, row: 0 });
    expect(store.hoverStyles.keys()).toHaveLength(2);
    const sheetId = model.getters.getActiveSheetId();
    expect(store.hoverStyles.get({ sheetId, col: 0, row: 0 })).toEqual({
      fillColor: "#0000FF",
      textColor: "#00FF00",
    });
    expect(store.hoverStyles.get({ sheetId, col: 1, row: 0 })).toEqual({ fillColor: "#0000FF" });
  });
});
