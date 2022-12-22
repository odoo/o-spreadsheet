import { Component, xml } from "@odoo/owl";
import { Model } from "../../src";
import { HeaderGroupContainer } from "../../src/components/header_group/header_group_container";
import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  GROUP_LAYER_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../src/constants";
import { Dimension, UID } from "../../src/types";
import {
  foldHeaderGroup,
  freezeColumns,
  freezeRows,
  groupColumns,
  groupHeaders,
  groupRows,
  hideColumns,
  hideRows,
  resizeColumns,
  resizeRows,
  setViewportOffset,
} from "../test_helpers/commands_helpers";
import { click, triggerMouseEvent } from "../test_helpers/dom_helper";
import {
  getStylePropertyInPx,
  mountComponent,
  mountSpreadsheet,
  nextTick,
} from "../test_helpers/helpers";

class Parent extends Component {
  static components = { HeaderGroupContainer };
  // o-spreadsheet div for portal target
  static template = xml/*xml*/ `
    <div class="o-spreadsheet">
      <HeaderGroupContainer t-props="props"/>
    </div>
  `;
}

describe("Integration tests", () => {
  let model: Model;
  let fixture: HTMLElement;

  beforeEach(async () => {
    ({ model, fixture } = await mountSpreadsheet());
  });

  describe("Grid container is adapted when there are groups of columns/rows", () => {
    test("Grid container with grouped columns", async () => {
      const gridContainer = fixture.querySelector<HTMLElement>(".o-grid-container")!;
      expect(gridContainer.style.gridTemplateRows).toBe("0px auto");
      expect(gridContainer.style.gridTemplateColumns).toBe("0px auto");

      groupColumns(model, "A", "B");
      await nextTick();
      expect(gridContainer.style.gridTemplateRows).toBe(`${GROUP_LAYER_WIDTH + 2}px auto`);
      expect(gridContainer.style.gridTemplateColumns).toBe("0px auto");

      // Two layers
      groupColumns(model, "A", "D");
      await nextTick();
      expect(gridContainer.style.gridTemplateRows).toBe(`${GROUP_LAYER_WIDTH * 2 + 2}px auto`);
      expect(gridContainer.style.gridTemplateColumns).toBe("0px auto");
    });

    test("Grid container with grouped rows", async () => {
      const gridContainer = fixture.querySelector<HTMLElement>(".o-grid-container")!;
      expect(gridContainer.style.gridTemplateRows).toBe("0px auto");
      expect(gridContainer.style.gridTemplateColumns).toBe("0px auto");

      groupRows(model, 1, 2);
      await nextTick();
      expect(gridContainer.style.gridTemplateRows).toBe("0px auto");
      expect(gridContainer.style.gridTemplateColumns).toBe(`${GROUP_LAYER_WIDTH + 2}px auto`);

      // Two layers
      groupRows(model, 1, 4);
      await nextTick();
      expect(gridContainer.style.gridTemplateRows).toBe("0px auto");
      expect(gridContainer.style.gridTemplateColumns).toBe(`${GROUP_LAYER_WIDTH * 2 + 2}px auto`);
    });

    test("Grid container with grouped columns and rows", async () => {
      const gridContainer = fixture.querySelector<HTMLElement>(".o-grid-container")!;

      groupColumns(model, "A", "B");
      groupRows(model, 1, 2);
      await nextTick();
      expect(gridContainer.style.gridTemplateRows).toBe(`${GROUP_LAYER_WIDTH + 2}px auto`);
      expect(gridContainer.style.gridTemplateColumns).toBe(`${GROUP_LAYER_WIDTH + 2}px auto`);

      // Two layers
      groupColumns(model, "A", "D");
      groupRows(model, 1, 4);
      await nextTick();
      expect(gridContainer.style.gridTemplateRows).toBe(`${GROUP_LAYER_WIDTH * 2 + 2}px auto`);
      expect(gridContainer.style.gridTemplateColumns).toBe(`${GROUP_LAYER_WIDTH * 2 + 2}px auto`);
    });

    test("Grid container is adapted dynamically with number of visible group layers", async () => {
      const gridContainer = fixture.querySelector<HTMLElement>(".o-grid-container")!;
      groupRows(model, 0, 6);
      groupRows(model, 1, 2);
      await nextTick();

      expect(gridContainer.style.gridTemplateColumns).toBe(`${GROUP_LAYER_WIDTH * 2 + 2}px auto`);

      foldHeaderGroup(model, "ROW", 0, 6);
      await nextTick();
      expect(gridContainer.style.gridTemplateColumns).toBe(`${GROUP_LAYER_WIDTH + 2}px auto`);
    });
  });

  test("Grid input has focus after click on header group", async () => {
    groupColumns(model, "A", "D");
    groupRows(model, 1, 4);
    await nextTick();

    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));

    (document.activeElement as HTMLElement).blur(); // blur element manually because JSDom don't change focus on click event
    await click(fixture.querySelectorAll<HTMLElement>(".o-header-group")[0]);
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));

    (document.activeElement as HTMLElement).blur();
    await click(fixture.querySelectorAll<HTMLElement>(".o-header-group")[1]);
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));
  });
});

describe("Header group component test", () => {
  let fixture: HTMLElement;
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  async function mountHeaderGroups(model: Model, dimension: Dimension) {
    const layers = model.getters.getGroupsLayers(sheetId, dimension);
    ({ fixture } = await mountComponent(Parent, {
      props: { layers, dimension },
      model,
    }));
  }

  describe("For column groups", () => {
    test("Snapshot", async () => {
      groupColumns(model, "A", "F");
      groupColumns(model, "C", "F");
      await mountHeaderGroups(model, "COL");

      const groups = fixture.querySelector<HTMLElement>(".o-header-group-container");
      expect(groups).toMatchSnapshot();
    });

    test("Groups positions", async () => {
      groupColumns(model, "A", "F");
      groupColumns(model, "C", "F");

      await mountHeaderGroups(model, "COL");
      const groups = fixture.querySelectorAll<HTMLElement>(".o-header-group");
      expect(groups.length).toBe(2);

      // For all the sizing/positioning, we include the group header that is on the columns before the group
      const group1 = fixture.querySelector<HTMLElement>('.o-header-group[data-id="0-5"]')!;
      expect(getStylePropertyInPx(group1, "left")).toBe(0);
      expect(getStylePropertyInPx(group1, "top")).toBe(0);
      expect(getStylePropertyInPx(group1, "width")).toBe(HEADER_WIDTH + DEFAULT_CELL_WIDTH * 6);
      expect(getStylePropertyInPx(group1, "height")).toBe(GROUP_LAYER_WIDTH);

      const group2 = fixture.querySelector<HTMLElement>('.o-header-group[data-id="2-5"]')!;
      expect(getStylePropertyInPx(group2, "left")).toBe(HEADER_WIDTH + DEFAULT_CELL_WIDTH);
      expect(getStylePropertyInPx(group2, "top")).toBe(GROUP_LAYER_WIDTH);
      expect(getStylePropertyInPx(group2, "width")).toBe(DEFAULT_CELL_WIDTH * 5);
      expect(getStylePropertyInPx(group2, "height")).toBe(GROUP_LAYER_WIDTH);
    });

    test("Header box is sized based on its matching columns", async () => {
      resizeColumns(model, ["A"], 200);
      groupColumns(model, "B", "C");

      await mountHeaderGroups(model, "COL");
      const header = fixture.querySelector<HTMLElement>(".o-header-group-header")!;
      expect(getStylePropertyInPx(header, "width")).toBe(200);
    });

    test("Scroll of the sheet is handled", async () => {
      groupColumns(model, "A", "F");
      await mountHeaderGroups(model, "COL");

      const scrollContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-scroll-container"
      )!;
      const group = fixture.querySelector<HTMLElement>(".o-header-group")!;

      expect(getStylePropertyInPx(scrollContainer, "left")).toBe(0);
      expect(getStylePropertyInPx(group, "left")).toBe(0);

      setViewportOffset(model, 3 * DEFAULT_CELL_WIDTH, 0);
      await nextTick();

      expect(getStylePropertyInPx(scrollContainer, "left")).toBe(-3 * DEFAULT_CELL_WIDTH);
      expect(getStylePropertyInPx(group, "left")).toBe(0);
    });

    test("Frozen panes are handled", async () => {
      groupColumns(model, "A", "F");
      await mountHeaderGroups(model, "COL");

      expect(fixture.querySelector(".o-header-group-frozen-pane")).toBeFalsy();
      freezeColumns(model, 2);
      await nextTick();

      const frozenPaneContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-frozen-pane"
      )!;
      const mainPaneContainer = fixture.querySelector<HTMLElement>(".o-header-group-main-pane")!;
      const scrollContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-scroll-container"
      )!;

      expect(frozenPaneContainer).toBeTruthy();
      expect(getStylePropertyInPx(frozenPaneContainer, "width")).toBe(
        HEADER_WIDTH + DEFAULT_CELL_WIDTH * 2
      );
      expect(getStylePropertyInPx(scrollContainer, "left")).toBe(
        -HEADER_WIDTH - DEFAULT_CELL_WIDTH * 2
      );

      // Group is duplicated in both containers
      expect(mainPaneContainer.querySelectorAll(".o-header-group")).toHaveLength(1);
      expect(frozenPaneContainer.querySelectorAll(".o-header-group")).toHaveLength(1);
    });

    test("Frozen panes are handled are handled", async () => {
      groupColumns(model, "A", "F");
      setViewportOffset(model, DEFAULT_CELL_WIDTH, 0);
      freezeColumns(model, 2);
      await mountHeaderGroups(model, "COL");

      const frozenPaneContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-frozen-pane"
      )!;
      const scrollContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-scroll-container"
      )!;

      expect(frozenPaneContainer).toBeTruthy();
      expect(getStylePropertyInPx(frozenPaneContainer, "width")).toBe(
        HEADER_WIDTH + DEFAULT_CELL_WIDTH * 2
      );
      expect(getStylePropertyInPx(scrollContainer, "left")).toBe(
        -HEADER_WIDTH - DEFAULT_CELL_WIDTH * 3
      ); // - frozenPaneContainer width - 1 scrolled columns
    });

    test("End of group border is not there when last column of group is hidden", async () => {
      groupColumns(model, "A", "F");
      await mountHeaderGroups(model, "COL");

      const group = fixture.querySelector<HTMLElement>(".o-header-group .o-group-border")!;
      expect(group.style["border-right"]).toBeTruthy();

      hideColumns(model, ["F"]);
      await nextTick();
      expect(group.style["border-right"]).toBeFalsy();
    });
  });

  describe("For row groups", () => {
    test("Snapshot", async () => {
      groupRows(model, 0, 5);
      groupRows(model, 2, 5);
      await mountHeaderGroups(model, "ROW");

      const groups = fixture.querySelector<HTMLElement>(".o-header-group-container");
      expect(groups).toMatchSnapshot();
    });

    test("Groups positions", async () => {
      groupRows(model, 0, 5);
      groupRows(model, 2, 3);

      await mountHeaderGroups(model, "ROW");
      const groups = fixture.querySelectorAll<HTMLElement>(".o-header-group");
      expect(groups.length).toBe(2);

      // For all the sizing/positioning, we include the group header that is on the rows before the group
      const group1 = fixture.querySelector<HTMLElement>('.o-header-group[data-id="0-5"]')!;
      expect(getStylePropertyInPx(group1, "left")).toBe(0);
      expect(getStylePropertyInPx(group1, "top")).toBe(0);
      expect(getStylePropertyInPx(group1, "width")).toBe(GROUP_LAYER_WIDTH);
      expect(getStylePropertyInPx(group1, "height")).toBe(HEADER_HEIGHT + DEFAULT_CELL_HEIGHT * 6);

      const group2 = fixture.querySelector<HTMLElement>('.o-header-group[data-id="2-3"]')!;
      expect(getStylePropertyInPx(group2, "left")).toBe(GROUP_LAYER_WIDTH);
      expect(getStylePropertyInPx(group2, "top")).toBe(HEADER_HEIGHT + DEFAULT_CELL_HEIGHT);
      expect(getStylePropertyInPx(group2, "width")).toBe(GROUP_LAYER_WIDTH);
      expect(getStylePropertyInPx(group2, "height")).toBe(DEFAULT_CELL_HEIGHT * 3);
    });

    test("Header box is sized based on its matching columns", async () => {
      resizeRows(model, [0], 200);
      groupRows(model, 1, 2);

      await mountHeaderGroups(model, "ROW");
      const header = fixture.querySelector<HTMLElement>(".o-header-group-header")!;
      expect(getStylePropertyInPx(header, "height")).toBe(200);
    });

    test("Scroll of the sheet is handled", async () => {
      groupRows(model, 0, 10);
      await mountHeaderGroups(model, "ROW");

      const scrollContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-scroll-container"
      )!;
      const group = fixture.querySelector<HTMLElement>(".o-header-group")!;

      expect(getStylePropertyInPx(scrollContainer, "top")).toBe(0);
      expect(getStylePropertyInPx(group, "top")).toBe(0);

      setViewportOffset(model, 0, 3 * DEFAULT_CELL_HEIGHT);
      await nextTick();

      expect(getStylePropertyInPx(scrollContainer, "top")).toBe(-3 * DEFAULT_CELL_HEIGHT);
      expect(getStylePropertyInPx(group, "top")).toBe(0);
    });

    test("Frozen panes are handled", async () => {
      groupRows(model, 0, 5);
      await mountHeaderGroups(model, "ROW");

      expect(fixture.querySelector(".o-header-group-frozen-pane")).toBeFalsy();
      freezeRows(model, 2);
      await nextTick();

      const frozenPaneContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-frozen-pane"
      )!;
      const mainPaneContainer = fixture.querySelector<HTMLElement>(".o-header-group-main-pane")!;
      const scrollContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-scroll-container"
      )!;

      expect(frozenPaneContainer).toBeTruthy();
      expect(getStylePropertyInPx(frozenPaneContainer, "height")).toBe(
        HEADER_HEIGHT + DEFAULT_CELL_HEIGHT * 2
      );
      expect(getStylePropertyInPx(scrollContainer, "top")).toBe(
        -HEADER_HEIGHT - DEFAULT_CELL_HEIGHT * 2
      );

      // Group is duplicated in both containers
      expect(mainPaneContainer.querySelectorAll(".o-header-group")).toHaveLength(1);
      expect(frozenPaneContainer.querySelectorAll(".o-header-group")).toHaveLength(1);
    });

    test("Frozen panes are handled are handled", async () => {
      groupRows(model, 0, 5);
      setViewportOffset(model, 0, DEFAULT_CELL_HEIGHT);
      freezeRows(model, 2);
      await mountHeaderGroups(model, "ROW");

      const frozenPaneContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-frozen-pane"
      )!;
      const scrollContainer = fixture.querySelector<HTMLElement>(
        ".o-header-group-scroll-container"
      )!;

      expect(frozenPaneContainer).toBeTruthy();
      expect(getStylePropertyInPx(frozenPaneContainer, "height")).toBe(
        HEADER_HEIGHT + DEFAULT_CELL_HEIGHT * 2
      );
      expect(getStylePropertyInPx(scrollContainer, "top")).toBe(
        -HEADER_HEIGHT - DEFAULT_CELL_HEIGHT * 3
      ); // - frozenPaneContainer height - 1 scrolled row
    });

    test("End of group border is not there when last row of group is hidden", async () => {
      groupRows(model, 0, 5);
      await mountHeaderGroups(model, "ROW");

      const group = fixture.querySelector<HTMLElement>(".o-header-group .o-group-border")!;
      expect(group.style["border-bottom"]).toBeTruthy();

      hideRows(model, [5]);
      await nextTick();
      expect(group.style["border-bottom"]).toBeFalsy();
    });
  });

  describe.each(["COL", "ROW"] as const)("Common tests for row and column groups", (dimension) => {
    test("Can toggle group", async () => {
      groupHeaders(model, dimension, 0, 2);
      await mountHeaderGroups(model, dimension);

      const group = fixture.querySelector<HTMLElement>(".o-header-group")!;
      const button = group.querySelector<HTMLElement>(".o-group-fold-button")!;

      expect(button.querySelector(".o-icon.minus")).toBeTruthy();
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 2)).toBe(false);
      button.click();
      await nextTick();

      expect(button.querySelector(".o-icon.plus")).toBeTruthy();
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 2)).toBe(true);
      button.click();
      await nextTick();

      expect(button.querySelector(".o-icon.minus")).toBeTruthy();
      expect(model.getters.isGroupFolded(sheetId, dimension, 0, 2)).toBe(false);
    });

    describe("Context menu test", () => {
      function getMenuItem(name: string) {
        return fixture.querySelector<HTMLElement>(`.o-menu-item[data-name=${name}]`)!;
      }

      beforeEach(async () => {
        groupHeaders(model, dimension, 1, 2);
        groupHeaders(model, dimension, 4, 5);

        await mountHeaderGroups(model, dimension);

        triggerMouseEvent('.o-header-group[data-id="1-2"]', "contextmenu");
        await nextTick();
      });

      test("Can fold/unfold group with the context menu", () => {
        click(getMenuItem("toggle_group"));
        expect(model.getters.isGroupFolded(sheetId, dimension, 1, 2)).toBe(true);
        expect(model.getters.isGroupFolded(sheetId, dimension, 4, 5)).toBe(false);

        click(getMenuItem("toggle_group"));
        expect(model.getters.isGroupFolded(sheetId, dimension, 1, 2)).toBe(false);
        expect(model.getters.isGroupFolded(sheetId, dimension, 4, 5)).toBe(false);
      });

      test("Can remove group with the context menu", () => {
        click(getMenuItem("remove_group"));
        expect(model.getters.getHeaderGroup(sheetId, dimension, 1, 2)).toBeFalsy();
      });

      test("Can fold/unfold all groups with the context menu", () => {
        expect(model.getters.isGroupFolded(sheetId, dimension, 1, 2)).toBe(false);
        expect(model.getters.isGroupFolded(sheetId, dimension, 4, 5)).toBe(false);

        click(getMenuItem("fold_all"));
        expect(model.getters.isGroupFolded(sheetId, dimension, 1, 2)).toBe(true);
        expect(model.getters.isGroupFolded(sheetId, dimension, 4, 5)).toBe(true);

        click(getMenuItem("unfold_all"));
        expect(model.getters.isGroupFolded(sheetId, dimension, 1, 2)).toBe(false);
        expect(model.getters.isGroupFolded(sheetId, dimension, 4, 5)).toBe(false);
      });
    });
  });
});
