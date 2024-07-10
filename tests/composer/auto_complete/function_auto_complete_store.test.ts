import { ComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { setCellContent } from "../../test_helpers/commands_helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Function auto complete", () => {
  test("start with exact match, but with other proposals", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    setCellContent(model, "A1", "=SUM");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toHaveLength(10);
    expect(proposals?.[0].text).toEqual("SUM");
    expect(proposals?.[1].text).toEqual("SUMIF");
    autoComplete?.selectProposal(proposals![0].text);
    expect(composer.currentContent).toEqual("=SUM(");
  });
});
