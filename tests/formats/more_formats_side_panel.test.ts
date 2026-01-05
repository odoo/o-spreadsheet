import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model } from "../../src";
import { MoreFormatsPanel } from "../../src/components/side_panel/more_formats/more_formats";
import { click, setInputValueAndTrigger } from "../test_helpers";
import { selectCell, setFormat } from "../test_helpers/commands_helpers";
import { getCellFormat } from "../test_helpers/getters_helpers";
import { mountComponent, mountSpreadsheet, nextTick } from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;

function getExampleValues() {
  const tableRows = fixture.querySelectorAll(".o-more-formats-panel table tr");
  return Array.from(tableRows).map((row) => row.children[1].textContent);
}

describe("more formats side panel component", () => {
  beforeEach(() => {
    model = new Model();
  });

  async function mountFormatPanel(
    env?: SpreadsheetChildEnv,
    props?: Partial<MoreFormatsPanel["props"]>
  ) {
    ({ fixture } = await mountComponent(MoreFormatsPanel, {
      model,
      props: { onCloseSidePanel: () => {}, ...props },
      env,
    }));
  }

  test("Can open the panel in the category from the props", async () => {
    await mountFormatPanel(undefined, { category: "date" });
    expect(".o-badge-selection .selected").toHaveText("Date");
  });

  test("Category is correctly detected from the selected cell format", async () => {
    setFormat(model, "A1", "[$$]0.00");
    setFormat(model, "B2", "dd/mm/yyyy");
    setFormat(model, "C3", "0.00");

    selectCell(model, "A1");
    // mount whole spreadsheet because onWillUpdateProps doesn't trigger on render if mounting only MoreFormatsPanel
    const { env } = await mountSpreadsheet({ model });
    env.openSidePanel("MoreFormats");
    await nextTick();
    expect(".o-badge-selection .selected").toHaveText("Currency");

    selectCell(model, "B2");
    await nextTick();
    expect(".o-badge-selection .selected").toHaveText("Date");

    selectCell(model, "C3");
    await nextTick();
    expect(".o-badge-selection .selected").toHaveText("Number");
  });

  test("Changing category applies the category default format", async () => {
    await mountFormatPanel();
    expect(getCellFormat(model, "A1")).toBeUndefined();

    await click(fixture, ".o-badge-selection [data-id='date']");
    expect(getCellFormat(model, "A1")).toBe("m/d/yyyy");
  });

  test("Going back to the previous category goes back to the previous used format", async () => {
    await mountFormatPanel();
    expect(getCellFormat(model, "A1")).toBeUndefined();
    await setInputValueAndTrigger(".o-custom-format-section input", "#,##0");

    await click(fixture, ".o-badge-selection [data-id='date']");
    expect(getCellFormat(model, "A1")).toBe("m/d/yyyy");

    await click(fixture, ".o-badge-selection [data-id='number']");
    expect(getCellFormat(model, "A1")).toBe("#,##0");
  });

  test("Can change the format from the list of proposals", async () => {
    await mountFormatPanel();
    expect(".o-custom-format-section input").toHaveValue("");

    await click(fixture, ".format-preview[data-name='0.00%']");
    expect(getCellFormat(model, "A1")).toBe("0.00%");
    expect(".o-custom-format-section input").toHaveValue("0.00%");
    expect(getExampleValues()).toEqual(["123456.00%", "-123456.00%", "0.00%"]);
  });

  test("Can change the format to automatic from the list of proposals", async () => {
    setFormat(model, "A1", "0.00%");
    await mountFormatPanel();
    expect(".o-custom-format-section input").toHaveValue("0.00%");

    await click(fixture, ".format-preview:nth-child(1)"); // first is automatic
    expect(getCellFormat(model, "A1")).toBe(undefined);
    expect(".o-custom-format-section input").toHaveValue("");
  });

  test("Can change the format from the custom format input", async () => {
    await mountFormatPanel();

    await setInputValueAndTrigger(".o-custom-format-section input", "#,##0");
    expect(getCellFormat(model, "A1")).toBe("#,##0");
    expect(".format-preview.active").toHaveText("-1,235");
    expect(getExampleValues()).toEqual(["1,235", "-1,235", "0"]);
  });

  test("Entering an invalid format in the format custom format input doesn't dispatch", async () => {
    await mountFormatPanel();

    await setInputValueAndTrigger(".o-custom-format-section input", "invalid format");
    expect(getCellFormat(model, "A1")).toBeUndefined();
    expect(".o-custom-format-section input").toHaveClass("o-invalid");
  });

  test("Entering a multi part format gives examples for all parts", async () => {
    await mountFormatPanel();

    await setInputValueAndTrigger(".o-custom-format-section input", "0.00");
    expect(getExampleValues()).toEqual(["1234.56", "-1234.56", "0.00"]);

    await setInputValueAndTrigger(".o-custom-format-section input", "0.00;(0.00);-");
    expect(getExampleValues()).toEqual(["1234.56", "(1234.56)", "-"]);

    await setInputValueAndTrigger(".o-custom-format-section input", '0.00;(0.00);-;@ "olà"');
    expect(getExampleValues()).toEqual(["1234.56", "(1234.56)", "-", "Text olà"]);
  });

  test("Changing the cell format updates the side panel", async () => {
    setFormat(model, "A1", "0.00%");
    // mount whole spreadsheet because onWillUpdateProps doesn't trigger on render if mounting only MoreFormatsPanel
    const { env } = await mountSpreadsheet({ model });
    env.openSidePanel("MoreFormats");
    await nextTick();
    expect(".o-custom-format-section input").toHaveValue("0.00%");

    setFormat(model, "A1", "#.##");
    await nextTick();
    expect(".o-custom-format-section input").toHaveValue("#.##");
  });
});
