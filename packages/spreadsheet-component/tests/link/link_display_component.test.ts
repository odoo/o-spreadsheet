import { Model, Spreadsheet } from "../../src";
import { buildSheetLink } from "../../src/helpers";
import {
  clearCell,
  createSheet,
  merge,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { clickCell, hoverCell, rightClickCell, simulateClick } from "../test_helpers/dom_helper";
import { getCell, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";

describe("link display component", () => {
  let fixture: HTMLElement;
  let model: Model;
  let parent: Spreadsheet;
  let notifyUser: jest.Mock;

  beforeEach(async () => {
    jest.useFakeTimers();
    notifyUser = jest.fn();
    ({ parent, model, fixture } = await mountSpreadsheet(undefined, { notifyUser }));
  });

  test("simple snapshot", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-popover")?.outerHTML).toMatchSnapshot();
  });

  test("Link display is not shown in dashboard mode", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    model.updateMode("dashboard");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-popover")).toBeNull();
  });

  test("link shows the url", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector("a")?.innerHTML).toBe("https://url.com");
    expect(fixture.querySelector("a")?.getAttribute("href")).toBe("https://url.com");
    expect(fixture.querySelector("a")?.getAttribute("title")).toBe("https://url.com");
    expect(fixture.querySelector("a")?.getAttribute("target")).toBe("_blank");
    expect(fixture.querySelector(".o-link-tool img")?.getAttribute("src")).toBe(
      "https://www.google.com/s2/favicons?sz=16&domain=https://url.com"
    );
  });

  test("sheet link title shows the sheet name and doesn't have a href", async () => {
    const sheetId = model.getters.getActiveSheetId();
    setCellContent(model, "A1", `[label](${buildSheetLink(sheetId)})`);
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector("a")?.innerHTML).toBe("Sheet1");
    expect(fixture.querySelector("a")?.getAttribute("title")).toBe("Sheet1");
    expect(fixture.querySelector(".o-link-tool img")).toBeNull();
    // with "href", the browser opens a new tab on CTRL+Click
    // it won't work since the "url" is custom and only makes sense within the spreadsheet
    expect(fixture.querySelector("a")?.getAttribute("href")).toBeNull();
  });

  test("link is displayed and closed when cell is hovered", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    await hoverCell(model, "A2", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
  });

  test("link is displayed when merged cell is hovered", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    merge(model, "A1:A2");
    await hoverCell(model, "A2", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    await hoverCell(model, "A3", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
  });

  test("link is displayed and closed when the cell is right-clicked", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    await rightClickCell(model, "A1");
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
  });

  test("link is displayed and closed when other cell is right-clicked", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    await rightClickCell(model, "A2");
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
  });

  test("right-click on a linked cell should show 'Edit Link' instead of 'Insert Link' in the context menu", async () => {
    setCellContent(model, "A1", "HELLO");
    await rightClickCell(model, "A1");
    expect(
      fixture.querySelector(".o-menu .o-menu-item[data-name='insert_link']")?.textContent
    ).toBe("Insert link");

    setCellContent(model, "A1", "[label](url.com)");
    await rightClickCell(model, "A1");
    expect(
      fixture.querySelector(".o-menu .o-menu-item[data-name='insert_link']")?.textContent
    ).toBe("Edit link");
  });

  test("component is closed when cell is deleted", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    clearCell(model, "A1");
    await nextTick();
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
  });

  test("component is not closed when leaving grid", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    // hover an other cell then move your cursor from the grid.
    // i.e hover the link component itself
    await hoverCell(model, "A2", 100);
    fixture.querySelector(".o-grid-overlay")?.dispatchEvent(new Event("mouseleave"));
    jest.advanceTimersByTime(10000);
    await nextTick();
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();

    fixture.querySelector(".o-grid-overlay")?.dispatchEvent(new Event("mouseenter"));
    jest.advanceTimersByTime(400);
    await nextTick();
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
  });

  test("component is not closed when side panel is opened", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    parent.env.openSidePanel("FindAndReplace");
    await nextTick();
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
  });

  test.each(["A1", "A10"])("remove link by clicking the unlink icon", async (xc) => {
    setCellContent(model, xc, "[label](url.com)");
    await hoverCell(model, xc, 400);
    await simulateClick(".o-unlink");
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
    expect(getEvaluatedCell(model, xc).link).toBeFalsy();
    expect(getCell(model, xc)?.content).toBe("label");
  });

  test("link text color is removed when the cell is unlinked", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheetId: model.getters.getActiveSheetId(),
      content: "[label](url.com)",
      style: { bold: true },
    });
    await simulateClick(".o-unlink");
    expect(getCell(model, "A1")?.style).toEqual({
      bold: true,
      textColor: undefined,
      underline: undefined,
    });
  });

  test("link text color is not removed when the cell is unlinked if it is custom", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheetId: model.getters.getActiveSheetId(),
      style: { bold: true, textColor: "#555" },
    });
    await hoverCell(model, "A1", 400);
    await simulateClick(".o-unlink");
    expect(getCell(model, "A1")?.style).toEqual({
      bold: true,
      textColor: "#555",
      underline: undefined,
    });
  });

  test("open link editor selects the related cell in the grid", async () => {
    selectCell(model, "A10");
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    await simulateClick(".o-edit-link");
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
    expect(model.getters.getActivePosition()).toMatchObject({ col: 0, row: 0 });
    const editor = fixture.querySelector(".o-link-editor");
    expect(editor).toBeTruthy();
    const inputs = editor?.querySelectorAll("input")!;
    expect(inputs[0].value).toBe("label");
    expect(inputs[1].value).toBe("https://url.com");
  });

  test("open link editor ", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    await simulateClick(".o-edit-link");
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
    const editor = fixture.querySelector(".o-link-editor");
    expect(editor).toBeTruthy();
    const inputs = editor?.querySelectorAll("input")!;
    expect(inputs[0].value).toBe("label");
    expect(inputs[1].value).toBe("https://url.com");
  });

  test("click on a web link opens the page", async () => {
    const spy = jest.spyOn(window, "open").mockImplementation();
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    await simulateClick("a");
    expect(spy).toHaveBeenCalledWith("https://url.com", "_blank");
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
  });

  test("click on a sheet link activates the sheet", async () => {
    const sheetId = "42";
    createSheet(model, { sheetId });
    setCellContent(model, "A1", `[label](${buildSheetLink(sheetId)})`);
    await hoverCell(model, "A1", 400);
    expect(model.getters.getActiveSheetId()).not.toBe(sheetId);
    await simulateClick("a");
    expect(model.getters.getActiveSheetId()).toBe(sheetId);
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
  });

  test("click on a link to an hidden sheet do nothing and warns the user", async () => {
    createSheet(model, { sheetId: "42", hidden: true });
    setCellContent(model, "A1", `[label](${buildSheetLink("42")})`);
    await hoverCell(model, "A1", 400);
    await simulateClick("a");
    expect(model.getters.getActiveSheetId()).not.toBe("42");
    expect(notifyUser).toHaveBeenCalledWith({
      type: "warning",
      sticky: false,
      text: "Cannot open the link because the linked sheet is hidden.",
    });
  });

  test("click on the grid closes the popover", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    await hoverCell(model, "B2", 1);
    await clickCell(model, "B2");
    expect(fixture.querySelector(".o-link-tool")).toBeFalsy();
  });

  test("click on the same cell does not close the popover", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    await hoverCell(model, "A1", 1);
    await clickCell(model, "A1");
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
  });

  test("click on the same cell without moving does not close the popover", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
    await clickCell(model, "A1");
    expect(fixture.querySelector(".o-link-tool")).toBeTruthy();
  });

  test("remove/edit link are hidden in readonly mode", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await nextTick();
    model.updateMode("readonly");
    await hoverCell(model, "A1", 400);
    const linkTool = fixture.querySelector(".o-link-tool");
    expect(linkTool).toBeTruthy();
    expect(linkTool!.querySelector(".o-unlink")).toBeFalsy();
    expect(linkTool!.querySelector(".o-edit-link")).toBeFalsy();
  });
});
