import { ClickableCellsStore } from "../../src/components/dashboard/clickable_cell_store";
import { toXC, toZone } from "../../src/helpers";
import { clickableCellRegistry } from "../../src/registries/cell_clickable_registry";
import { registerCleanup } from "../setup/jest.setup";
import { triggerMouseEvent } from "../test_helpers/dom_helper";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";

describe("clickable cells components", () => {
  test("is rendered in the DOM", async () => {
    clickableCellRegistry.add("test", {
      condition: (position, getters) => toXC(position.col, position.row) === "A1",
      execute() {},
      sequence: 1,
    });
    registerCleanup(() => clickableCellRegistry.remove("test"));
    const { model } = await mountSpreadsheet();
    model.updateMode("dashboard");
    await nextTick();
    expect("div.o-dashboard-clickable-cell").toHaveCount(1);
  });

  test("can be hovered", async () => {
    clickableCellRegistry.add("test", {
      condition: (position) => toXC(position.col, position.row) === "A1",
      execute() {},
      hoverStyle: () => [{ zone: toZone("A1"), style: { fillColor: "#0000FF" } }],
      sequence: 1,
    });
    registerCleanup(() => clickableCellRegistry.remove("test"));
    const { model, env } = await mountSpreadsheet();
    const store = env.getStore(ClickableCellsStore);
    model.updateMode("dashboard");
    await nextTick();
    expect(store.hoveredCol).toBeUndefined();
    expect(store.hoveredRow).toBeUndefined();
    triggerMouseEvent(".o-dashboard-clickable-cell", "pointerenter");
    expect(store.hoveredCol).toBe(0);
    expect(store.hoveredRow).toBe(0);
    const sheetId = model.getters.getActiveSheetId();
    expect(store.hoverStyles.get({ sheetId, col: 0, row: 0 })).toEqual({ fillColor: "#0000FF" });
    triggerMouseEvent(".o-dashboard-clickable-cell", "pointerleave");
    expect(store.hoveredCol).toBeUndefined();
    expect(store.hoveredRow).toBeUndefined();
  });
});
