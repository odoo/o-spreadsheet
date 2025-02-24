import { CellComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { createSheet } from "../../test_helpers/commands_helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Sheet name auto complete", () => {
  test("auto complete a single sheet", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    createSheet(model, { name: "MySheet" });
    composer.startEdition("=MyS");
    const proposals = composer.autoCompleteProposals;
    expect(proposals).toEqual([
      {
        text: "MySheet",
        fuzzySearchKey: "'MySheet",
      },
    ]);
    composer.insertAutoCompleteValue(proposals![0].text);
    expect(composer.currentContent).toEqual("=MySheet!");
  });

  test("auto complete a sheet with spaces", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    createSheet(model, { name: "My awesome sheet" });
    composer.startEdition("=aweso");
    const proposals = composer.autoCompleteProposals;
    expect(proposals).toEqual([
      {
        text: "'My awesome sheet'",
        fuzzySearchKey: "'My awesome sheet'",
      },
    ]);
    composer.insertAutoCompleteValue(proposals![0].text);
    expect(composer.currentContent).toEqual("='My awesome sheet'!");
  });

  test("function auto complete has higher priority", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    createSheet(model, { name: "SUM" });
    composer.startEdition("=SU");
    const proposals = composer.autoCompleteProposals;
    expect(proposals![0].text).toEqual("SUM");
    expect(proposals![0].description?.toString()).toEqual(
      "Sum of a series of numbers and/or cells."
    );
  });

  test("starting with single quote matches the sheet even if the quote is not required", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    createSheet(model, { name: "Hello" });
    composer.startEdition("='Hel");
    const proposals = composer.autoCompleteProposals;
    expect(proposals![0].text).toEqual("Hello");
    composer.insertAutoCompleteValue(proposals![0].text);
    expect(composer.currentContent).toEqual("=Hello!");
  });

  test("one single quote matches all sheets", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    createSheet(model, { name: "Hello" });
    composer.startEdition("='");
    const proposals = composer.autoCompleteProposals;
    expect(proposals![0].text).toEqual("Sheet1");
    expect(proposals![1].text).toEqual("Hello");
  });
});
