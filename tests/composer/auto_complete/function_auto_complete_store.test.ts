import { CellComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { createNamedRange, selectCell, setCellContent } from "../../test_helpers/commands_helpers";
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

  test("Function autocomplete also shows named ranges", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    createNamedRange(model, "VLookupNamedRange", "B1:B10");
    setCellContent(model, "A1", "=VLOOKUP");
    composer.startEdition();
    await nextTick();

    const proposals = composer.autoCompleteProposals;
    expect(proposals).toHaveLength(2);
    expect(proposals[0].text).toBe("VLOOKUP");
    expect(proposals[1].text).toBe("VLookupNamedRange");

    composer.insertAutoCompleteValue(proposals[1]);
    expect(composer.currentContent).toBe("=VLookupNamedRange"); // No parentheses for named ranges
  });

  test("Autocomplete works if the named range has the same name as a formula", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    createNamedRange(model, "VLOOKUP", "B1:B10");
    setCellContent(model, "A1", "=VLOOK");
    composer.startEdition();
    await nextTick();

    const proposals = composer.autoCompleteProposals;
    expect(proposals).toHaveLength(2);
    expect(proposals?.[0].text).toBe("VLOOKUP");
    expect(proposals?.[1].text).toBe("VLOOKUP");

    // Insert the formula
    composer.insertAutoCompleteValue(proposals[0]);
    expect(composer.currentContent).toBe("=VLOOKUP(");

    // Restart edition
    setCellContent(model, "A1", "=VLOOK");
    composer.startEdition();
    await nextTick();

    // Insert the named range
    composer.insertAutoCompleteValue(composer.autoCompleteProposals[1]);
    expect(composer.currentContent).toBe("=VLOOKUP"); // No parentheses for named ranges
  });

  test("Autocomplete is closed after selecting a named range from an empty content", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    createNamedRange(model, "MyRange", "B1:B10");

    composer.startEdition("=MyRa");
    await nextTick();
    expect(composer.autoCompleteProposals).toHaveLength(1);

    composer.insertAutoCompleteValue(composer.autoCompleteProposals[0]);
    await nextTick();
    expect(composer.currentContent).toBe("=MyRange");
    expect(composer.autoCompleteProposals).toHaveLength(0);
    expect(composer.editionMode).toBe("editing");
  });

  test("Autocomplete is closed after selecting a named range from a content that already has the named range", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    createNamedRange(model, "MyRange", "B1:B10");
    setCellContent(model, "A1", "=MyRange");

    composer.startEdition();
    await nextTick();
    expect(composer.autoCompleteProposals).toHaveLength(1);

    composer.insertAutoCompleteValue(composer.autoCompleteProposals[0]);
    await nextTick();
    expect(composer.currentContent).toBe("=MyRange");
    expect(composer.autoCompleteProposals).toHaveLength(0);
    expect(composer.editionMode).toBe("editing");
  });
});
