import { ComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { createSheet } from "../../test_helpers/commands_helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Sheet name auto complete", () => {
  test("auto complete a single sheet", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    createSheet(model, { name: "MySheet" });
    composer.startEdition("=MyS");
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toEqual([
      {
        text: "MySheet",
        fuzzySearchKey: "'MySheet",
      },
    ]);
    autoComplete?.selectProposal(proposals![0].text);
    expect(composer.currentContent).toEqual("=MySheet!");
  });

  test("auto complete a sheet with spaces", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    createSheet(model, { name: "My awesome sheet" });
    composer.startEdition("=aweso");
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toEqual([
      {
        text: "'My awesome sheet'",
        fuzzySearchKey: "'My awesome sheet'",
      },
    ]);
    autoComplete?.selectProposal(proposals![0].text);
    expect(composer.currentContent).toEqual("='My awesome sheet'!");
  });

  test("function auto complete has higher priority", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    createSheet(model, { name: "SUM" });
    composer.startEdition("=SU");
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals![0].text).toEqual("SUM");
    expect(proposals![0].description?.toString()).toEqual(
      "Sum of a series of numbers and/or cells."
    );
  });

  test("starting with single quote matches the sheet even if the quote is not required", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    createSheet(model, { name: "Hello" });
    composer.startEdition("='Hel");
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals![0].text).toEqual("Hello");
    autoComplete?.selectProposal(proposals![0].text);
    expect(composer.currentContent).toEqual("=Hello!");
  });

  test("one single quote matches all sheets", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    createSheet(model, { name: "Hello" });
    composer.startEdition("='");
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals![0].text).toEqual("Sheet1");
    expect(proposals![1].text).toEqual("Hello");
  });
});
