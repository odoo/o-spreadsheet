import { CellComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { selectCell, setCellContent } from "../../test_helpers/commands_helpers";
import { nextTick } from "../../test_helpers/helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Function auto complete", () => {
  test("start with exact match, but with other proposals", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    setCellContent(model, "A1", "=SUM");
    composer.startEdition();
    await nextTick();
    const proposals = composer.autoCompleteProposals;
    expect(proposals).toHaveLength(10);
    expect(proposals?.[0].text).toEqual("SUM");
    expect(proposals?.[1].text).toEqual("SUMIF");
    composer.insertAutoCompleteValue(proposals![0]);
    expect(composer.currentContent).toEqual("=SUM(");
  });

  test("function auto complete uses fuzzy search", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    setCellContent(model, "A1", "=VOK");
    composer.startEdition();
    await nextTick();
    const proposals = composer.autoCompleteProposals;
    expect(proposals).toHaveLength(1);
    expect(proposals?.[0].text).toBe("VLOOKUP");
    composer.insertAutoCompleteValue(proposals![0]);
    expect(composer.currentContent).toEqual("=VLOOKUP(");
  });

  test("reselect cell with existing content shows correct autocomplete proposals", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    setCellContent(model, "A1", "=VLOOKUP");
    selectCell(model, "A1");
    composer.startEdition();
    await nextTick();
    const proposals = composer.autoCompleteProposals;
    expect(proposals).toHaveLength(1);
    expect(proposals?.[0].text).toBe("VLOOKUP");
    composer.insertAutoCompleteValue(proposals![0]);
    expect(composer.currentContent).toEqual("=VLOOKUP(");
  });
});
