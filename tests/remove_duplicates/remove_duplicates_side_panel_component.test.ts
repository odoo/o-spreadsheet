import { Model, Spreadsheet } from "../../src";
import { toZone } from "../../src/helpers";
import { click, merge, setCellContent, setSelection } from "../test_helpers";
import { getRangeValuesAsMatrix, mountSpreadsheet, nextTick } from "../test_helpers/helpers";

const selectors = {
  closeSidepanel: ".o-sidePanel .o-sidePanelClose",
  statisticalInformation: ".o-sidePanel .o-remove-duplicates .o-validation-info",
  checkBoxHasHeaderRow: ".o-sidePanel .o-remove-duplicates input[name=dataHasHeader]",
  checkBoxColumnsLabel: ".o-sidePanel .o-remove-duplicates .o-checkbox-selection label",
  checkBoxColumnsInput: ".o-sidePanel .o-remove-duplicates .o-checkbox-selection input",
  sidePanelError: ".o-validation-error",
  removeDuplicateButton: ".o-sidePanel .o-remove-duplicates .o-button",
};

let model: Model;

describe("remove duplicates", () => {
  let fixture: HTMLElement;
  let parent: Spreadsheet;

  beforeEach(async () => {
    ({ parent, model, fixture } = await mountSpreadsheet());

    parent.env.openSidePanel("RemoveDuplicates");
    await nextTick();
  });

  test("Can close the find and replace side panel", async () => {
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
    await click(fixture, selectors.closeSidepanel);
    expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
  });

  test("displayed column names correspond to columns in selection", async () => {
    setSelection(model, ["B2:C6"]);
    await nextTick();
    const nodeList = fixture.querySelectorAll(selectors.checkBoxColumnsLabel);
    expect(nodeList.length).toBe(3);
    expect(nodeList[0].textContent).toBe("Select all");
    expect(nodeList[1].textContent).toBe("Column B");
    expect(nodeList[2].textContent).toBe("Column C");
  });

  test("select 'Data has header row' change the column label if content", async () => {
    setCellContent(model, "B2", "Bachibouzouk");
    setCellContent(model, "C2", "Cucurbitacee");
    setSelection(model, ["B2:D3"]);
    await click(fixture, selectors.checkBoxHasHeaderRow);
    const checkBox = fixture.querySelectorAll(selectors.checkBoxColumnsLabel);
    expect(checkBox.length).toBe(4);
    expect(checkBox[0].textContent).toBe("Select all");
    expect(checkBox[1].textContent).toBe("Column B - Bachibouzouk");
    expect(checkBox[2].textContent).toBe("Column C - Cucurbitacee");
    expect(checkBox[3].textContent).toBe("Column D");
  });

  test("display corresponding statistical information on the number of row/col selected", async () => {
    setSelection(model, ["E3:H7"]);
    await nextTick();
    expect(fixture.querySelector(selectors.statisticalInformation)!.textContent).toBe(
      "5 rows and 4 columns selected"
    );
  });

  test("update statistical information when selection change", async () => {
    setSelection(model, ["E3:H7"]);
    await nextTick();
    expect(fixture.querySelector(selectors.statisticalInformation)!.textContent).toBe(
      "5 rows and 4 columns selected"
    );

    setSelection(model, ["A1:B2"]);
    await nextTick();
    expect(fixture.querySelector(selectors.statisticalInformation)!.textContent).toBe(
      "2 rows and 2 columns selected"
    );
  });

  test("do the remove duplicates", async () => {
    const cells = {
      A1: { content: "11" },
      A2: { content: "88" },
      A3: { content: "11" },
      A4: { content: "88" },
      A5: { content: "11" },
    };

    model = new Model({ sheets: [{ cells }] });
    ({ parent, fixture } = await mountSpreadsheet({ model }));
    parent.env.openSidePanel("RemoveDuplicates");
    await nextTick();
    setSelection(model, ["A1:A5"]);
    await click(fixture, selectors.checkBoxHasHeaderRow);
    await click(fixture, selectors.removeDuplicateButton);

    expect(getRangeValuesAsMatrix(model, "A1:A5")).toEqual([[11], [88], [11], [null], [null]]);
  });

  test("checkboxes columns evolve with correct state ", async () => {
    setCellContent(model, "A1", "Atchoum");
    setSelection(model, ["A1:B2"]);
    await nextTick();

    let checkBoxes = fixture.querySelectorAll(selectors.checkBoxColumnsInput);
    let checkBoxAll = checkBoxes[0];
    let checkBoxA = checkBoxes[1];
    let checkBoxB = checkBoxes[2];

    // at the beginning --> expect all checkbox to be selected
    expect((checkBoxAll as HTMLInputElement).checked).toBe(true);
    expect((checkBoxA as HTMLInputElement).checked).toBe(true);
    expect((checkBoxB as HTMLInputElement).checked).toBe(true);

    // unselect "select all" --> all checkbox should be unselected
    await click(checkBoxAll);
    await nextTick();
    expect((checkBoxAll as HTMLInputElement).checked).toBe(false);
    expect((checkBoxA as HTMLInputElement).checked).toBe(false);
    expect((checkBoxB as HTMLInputElement).checked).toBe(false);

    // select A --> only A should be selected
    await click(checkBoxA);
    await nextTick();
    expect((checkBoxAll as HTMLInputElement).checked).toBe(false);
    expect((checkBoxA as HTMLInputElement).checked).toBe(true);
    expect((checkBoxB as HTMLInputElement).checked).toBe(false);

    // select B --> "select all" become selected because all checkbox are selected
    await click(checkBoxB);
    await nextTick();
    expect((checkBoxAll as HTMLInputElement).checked).toBe(true);
    expect((checkBoxA as HTMLInputElement).checked).toBe(true);
    expect((checkBoxB as HTMLInputElement).checked).toBe(true);

    // unselect A --> "select all" become unselected, still B selected
    await click(checkBoxA);
    await nextTick();
    expect((checkBoxAll as HTMLInputElement).checked).toBe(false);
    expect((checkBoxA as HTMLInputElement).checked).toBe(false);
    expect((checkBoxB as HTMLInputElement).checked).toBe(true);
  });

  test("the state of the checkboxes of the columns is preserved when extending the selection", async () => {
    setCellContent(model, "A1", "Atchoum");
    setSelection(model, ["A1:B2"]);
    await nextTick();

    let checkBoxes = fixture.querySelectorAll(selectors.checkBoxColumnsInput);
    let checkBoxAll = checkBoxes[0];
    let checkBoxA = checkBoxes[1];
    let checkBoxB = checkBoxes[2];

    // unselect B
    await click(checkBoxB);
    await nextTick();
    expect((checkBoxAll as HTMLInputElement).checked).toBe(false);
    expect((checkBoxA as HTMLInputElement).checked).toBe(true);
    expect((checkBoxB as HTMLInputElement).checked).toBe(false);

    // extend selection to C --> keep the state of the checkboxes A and B
    setSelection(model, ["A1:C2"]);
    await nextTick();
    expect((checkBoxAll as HTMLInputElement).checked).toBe(false);
    expect((checkBoxA as HTMLInputElement).checked).toBe(true);
    expect((checkBoxB as HTMLInputElement).checked).toBe(false);

    let checkBoxC = fixture.querySelectorAll(selectors.checkBoxColumnsInput)[3];
    expect((checkBoxC as HTMLInputElement).checked).toBe(true);
  });

  test("if no content selected --> display error message and disable ", async () => {
    setSelection(model, ["A1:B2"]);
    await nextTick();
    const errors = fixture.querySelectorAll(selectors.sidePanelError);
    expect(errors.length).toBe(1);
    expect(errors[0].textContent).toBe("Please select a range of cells containing values.");
    expect(fixture.querySelector(selectors.removeDuplicateButton)!.classList).toContain(
      "o-disabled"
    );
  });

  test("if more than one selection --> display error message and disable ", async () => {
    setSelection(model, ["A1:B2", "C3:D4"]);
    await nextTick();
    const errors = fixture.querySelectorAll(selectors.sidePanelError);
    expect(errors.length).toBe(1);
    expect(errors[0].textContent).toBe("Please select only one range of cells");
    expect(fixture.querySelector(selectors.removeDuplicateButton)!.classList).toContain(
      "o-disabled"
    );
  });

  test("if merges zone --> display error message and disable", async () => {
    merge(model, "A1:B1");
    merge(model, "A2:B2");
    setSelection(model, ["A1:B2"]);
    await nextTick();
    const errors = fixture.querySelectorAll(selectors.sidePanelError);
    expect(errors.length).toBe(1);
    expect(errors[0].textContent).toBe(
      "This operation is not possible due to a merge. Please remove the merges first than try again."
    );
    expect(fixture.querySelector(selectors.removeDuplicateButton)!.classList).toContain(
      "o-disabled"
    );
  });

  test("if no columns selected --> display error message and disable", async () => {
    const cells = { B1: { content: "42" }, B2: { content: "42" } };
    model = new Model({ sheets: [{ cells }] });
    ({ parent, fixture } = await mountSpreadsheet({ model }));
    setSelection(model, ["B1:B2"]);
    parent.env.openSidePanel("RemoveDuplicates");
    await nextTick();

    const checkBoxSelectAll = fixture.querySelectorAll(selectors.checkBoxColumnsInput)[0]; // checkBox[0] correspond to " Select all "
    await click(checkBoxSelectAll);

    const errors = fixture.querySelectorAll(selectors.sidePanelError);
    expect(errors.length).toBe(1);
    expect(errors[0].textContent).toBe("Please select at latest one column to analyze.");
    expect(fixture.querySelector(selectors.removeDuplicateButton)!.classList).toContain(
      "o-disabled"
    );
  });
});

describe("remove duplicate action", () => {
  test("expand selection to table if only one cell is selected", async () => {
    const cells = { B1: { content: "42" }, B2: { content: "42" } };
    const { fixture, model } = await mountSpreadsheet({
      model: new Model({ sheets: [{ cells }] }),
    });
    setSelection(model, ["B2"]);
    await nextTick();
    await click(fixture, ".o-topbar-menu[data-id='data']");
    await click(fixture, ".o-menu-item[data-name='data_cleanup']");
    await click(fixture, ".o-menu-item[data-name='remove_duplicates']");
    expect(model.getters.getSelectedZone()).toEqual(toZone("B1:B2"));
  });
});
