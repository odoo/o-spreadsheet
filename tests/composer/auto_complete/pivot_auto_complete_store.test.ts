import { ComposerStore } from "../../../src/components/composer/composer/composer_store";
import { addPivot, createModelWithPivot, updatePivot } from "../../test_helpers/pivot_helpers";
import { makeStoreWithModel } from "../../test_helpers/stores";

describe("spreadsheet pivot auto complete", () => {
  test("PIVOT.VALUE.* autocomplete pivot id", async () => {
    const model = createModelWithPivot("A1:I5");
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    addPivot(
      model,
      "A1:A4",
      {
        name: "My pivot 2",
        columns: [],
        rows: [],
        measures: [{ name: "Expected Revenue", aggregator: "sum" }],
      },
      "pivot2"
    );
    for (const func of ["PIVOT", "PIVOT.HEADER", "PIVOT.VALUE"]) {
      composer.startEdition(`=${func}(`);
      const autoComplete = composer.autocompleteProvider;
      expect(autoComplete?.proposals).toEqual([
        {
          description: "My pivot",
          fuzzySearchKey: "1My pivot",
          htmlContent: [{ color: "#02c39a", value: "1" }],
          text: "1",
        },
        {
          description: "My pivot 2",
          fuzzySearchKey: "2My pivot 2",
          htmlContent: [{ color: "#02c39a", value: "2" }],
          text: "2",
        },
      ]);
      autoComplete?.selectProposal(autoComplete?.proposals[0].text);
      expect(composer.currentContent).toBe(`=${func}(1`);
      expect(composer.autocompleteProvider).toBeUndefined();
      composer.cancelEdition();
    }
  });

  test("do not show autocomplete if pivot id already set", async () => {
    const model = createModelWithPivot("A1:I5");
    addPivot(model, "A1:A4", {
      columns: [],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    for (const func of ["PIVOT", "PIVOT.HEADER", "PIVOT.VALUE"]) {
      // id as a number
      composer.startEdition(`=${func}(1`);
      expect(composer.autocompleteProvider).toBeUndefined();
      composer.cancelEdition();

      // id as a string
      composer.startEdition(`=${func}("1"`);
      expect(composer.autocompleteProvider).toBeUndefined();
      composer.cancelEdition();
    }
  });

  test("PIVOT.VALUE measuresgd", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }, { name: "__count" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition("=PIVOT.VALUE(1,");
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        description: "Expected Revenue",
        fuzzySearchKey: '"Expected Revenue"',
        htmlContent: [{ color: "#00a82d", value: '"Expected Revenue"' }],
        text: '"Expected Revenue"',
      },
      {
        description: "Count",
        fuzzySearchKey: 'Count"__count"',
        htmlContent: [{ color: "#00a82d", value: '"__count"' }],
        text: '"__count"',
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.VALUE(1,"Expected Revenue"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE measure with the pivot id as a string", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE("1",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Expected Revenue"']);
  });

  test("PIVOT.VALUE measure with pivot id that does not exist", async () => {
    const model = createModelWithPivot("A1:I5");
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition(`=PIVOT.VALUE(9999,`);
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE measure without any pivot id", async () => {
    const model = createModelWithPivot("A1:I5");
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition(`=PIVOT.VALUE(,`);
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE group with a single col group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Stage" }],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        description: "Stage",
        fuzzySearchKey: '"Stage"',
        htmlContent: [{ color: "#00a82d", value: '"Stage"' }],
        text: '"Stage"',
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.VALUE(1,"Expected Revenue","Stage"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE group with a pivot id as string", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Stage" }],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE("1","Expected Revenue",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Stage"']);
  });

  test("PIVOT.VALUE group with a single row group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ name: "Stage" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        description: "Stage",
        fuzzySearchKey: '"Stage"',
        htmlContent: [{ color: "#00a82d", value: '"Stage"' }],
        text: '"Stage"',
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.VALUE(1,"Expected Revenue","Stage"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE group with a single date grouped by day", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ name: "Created on", granularity: "day" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        description: "Created on",
        fuzzySearchKey: '"Created on:day"',
        htmlContent: [{ color: "#00a82d", value: '"Created on:day"' }],
        text: '"Created on:day"',
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.VALUE(1,"Expected Revenue","Created on:day"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE search field", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ name: "Stage" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","sta');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Stage"']);
  });

  test("PIVOT.VALUE search field with both col and row group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Stage" }],
      rows: [{ name: "Created on", granularity: "month_number" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue", ');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual([
      '"Stage"',
      '"Created on:month_number"',
    ]);
  });

  test("PIVOT.VALUE group with row and col groups for the first group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Created on", granularity: "month_number" }],
      rows: [{ name: "Stage" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual([
      '"Created on:month_number"',
      '"Stage"',
    ]);
  });

  test("PIVOT.VALUE group with row and col groups for the col group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Created on", granularity: "month_number" }],
      rows: [{ name: "Stage" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Stage",1,');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Created on:month_number"']);
  });

  test("PIVOT.VALUE group with two rows, on the first group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      rows: [{ name: "Stage" }, { name: "Created on", granularity: "month_number" }],
      columns: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition(
      '=PIVOT.VALUE(1,"Expected Revenue", ,"Won","Created on:month_number", 11)'
    );
    //.......................................................^ set the cursor here
    composer.changeComposerCursorSelection(34, 34);
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Stage"']);
  });

  test("PIVOT.VALUE autocomplete text field for group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ name: "Stage" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Stage",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        description: "",
        fuzzySearchKey: "New",
        htmlContent: [{ color: "#00a82d", value: '"New"' }],
        text: '"New"',
      },
      {
        description: "",
        fuzzySearchKey: "Won",
        htmlContent: [{ color: "#00a82d", value: '"Won"' }],
        text: '"Won"',
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.VALUE(1,"Expected Revenue","Stage","New"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE autocomplete date month_number field for group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ name: "Created on", granularity: "month_number" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:month_number",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        description: "January",
        fuzzySearchKey: "January",
        htmlContent: [{ color: "#02c39a", value: "1" }],
        text: "1",
      },
      {
        description: "February",
        fuzzySearchKey: "February",
        htmlContent: [{ color: "#02c39a", value: "2" }],
        text: "2",
      },
      {
        description: "March",
        fuzzySearchKey: "March",
        htmlContent: [{ color: "#02c39a", value: "3" }],
        text: "3",
      },
      {
        description: "April",
        fuzzySearchKey: "April",
        htmlContent: [{ color: "#02c39a", value: "4" }],
        text: "4",
      },
      {
        description: "May",
        fuzzySearchKey: "May",
        htmlContent: [{ color: "#02c39a", value: "5" }],
        text: "5",
      },
      {
        description: "June",
        fuzzySearchKey: "June",
        htmlContent: [{ color: "#02c39a", value: "6" }],
        text: "6",
      },
      {
        description: "July",
        fuzzySearchKey: "July",
        htmlContent: [{ color: "#02c39a", value: "7" }],
        text: "7",
      },
      {
        description: "August",
        fuzzySearchKey: "August",
        htmlContent: [{ color: "#02c39a", value: "8" }],
        text: "8",
      },
      {
        description: "September",
        fuzzySearchKey: "September",
        htmlContent: [{ color: "#02c39a", value: "9" }],
        text: "9",
      },
      {
        description: "October",
        fuzzySearchKey: "October",
        htmlContent: [{ color: "#02c39a", value: "10" }],
        text: "10",
      },
      {
        description: "November",
        fuzzySearchKey: "November",
        htmlContent: [{ color: "#02c39a", value: "11" }],
        text: "11",
      },
      {
        description: "December",
        fuzzySearchKey: "December",
        htmlContent: [{ color: "#02c39a", value: "12" }],
        text: "12",
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe(
      '=PIVOT.VALUE(1,"Expected Revenue","Created on:month_number",1'
    );
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE autocomplete date quarter_number field for group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ name: "Created on", granularity: "quarter_number" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:quarter_number",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        description: "Quarter 1",
        fuzzySearchKey: "1",
        htmlContent: [{ color: "#02c39a", value: "1" }],
        text: "1",
      },
      {
        description: "Quarter 2",
        fuzzySearchKey: "2",
        htmlContent: [{ color: "#02c39a", value: "2" }],
        text: "2",
      },
      {
        description: "Quarter 3",
        fuzzySearchKey: "3",
        htmlContent: [{ color: "#02c39a", value: "3" }],
        text: "3",
      },
      {
        description: "Quarter 4",
        fuzzySearchKey: "4",
        htmlContent: [{ color: "#02c39a", value: "4" }],
        text: "4",
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe(
      '=PIVOT.VALUE(1,"Expected Revenue","Created on:quarter_number",1'
    );
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE autocomplete date day_of_month field for group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ name: "Created on", granularity: "day_of_month" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:day_of_month",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toHaveLength(31);
    expect(autoComplete?.proposals[0]).toEqual({
      description: "",
      fuzzySearchKey: "1",
      htmlContent: [{ color: "#02c39a", value: "1" }],
      text: "1",
    });
    expect(autoComplete?.proposals[30]).toEqual({
      description: "",
      fuzzySearchKey: "31",
      htmlContent: [{ color: "#02c39a", value: "31" }],
      text: "31",
    });
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe(
      '=PIVOT.VALUE(1,"Expected Revenue","Created on:day_of_month",1'
    );
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE autocomplete date iso_week_number field for group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ name: "Created on", granularity: "iso_week_number" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:iso_week_number",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toHaveLength(54);
    expect(autoComplete?.proposals[0]).toEqual({
      description: "",
      fuzzySearchKey: "0",
      htmlContent: [{ color: "#02c39a", value: "0" }],
      text: "0",
    });
    expect(autoComplete?.proposals[53]).toEqual({
      description: "",
      fuzzySearchKey: "53",
      htmlContent: [{ color: "#02c39a", value: "53" }],
      text: "53",
    });
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe(
      '=PIVOT.VALUE(1,"Expected Revenue","Created on:iso_week_number",0'
    );
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE autocomplete field after a date field", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Stage" }],
      rows: [{ name: "Created on", granularity: "month_number" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:month_number",11,');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Stage"']);
  });

  test("PIVOT.VALUE no autocomplete value for wrong group field", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ name: "Stage" }],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","not a dimension",');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.HEADER first field", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Stage" }],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition("=PIVOT.HEADER(1,");
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Stage"']);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.HEADER(1,"Stage"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.HEADER search field", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Stage" }],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.HEADER(1,"sta');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Stage"']);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.HEADER(1,"Stage"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.HEADER group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ name: "Stage" }],
      rows: [],
      measures: [{ name: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, ComposerStore);
    composer.startEdition('=PIVOT.HEADER(1,"Stage",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"New"', '"Won"']);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.HEADER(1,"Stage","New"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });
});
