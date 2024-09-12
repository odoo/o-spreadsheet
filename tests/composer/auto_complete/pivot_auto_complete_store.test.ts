import { CellComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { StandaloneComposerStore } from "../../../src/components/composer/standalone_composer/standalone_composer_store";
import { createMeasureAutoComplete } from "../../../src/registries/auto_completes/pivot_dimension_auto_complete";
import { addPivot, createModelWithPivot, updatePivot } from "../../test_helpers/pivot_helpers";
import { makeStoreWithModel } from "../../test_helpers/stores";

describe("spreadsheet pivot auto complete", () => {
  test("PIVOT.VALUE.* autocomplete pivot id", async () => {
    const model = createModelWithPivot("A1:I5");
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    addPivot(
      model,
      "A1:A4",
      {
        name: "My pivot 2",
        columns: [],
        rows: [],
        measures: [
          { id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" },
        ],
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
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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

  test("PIVOT.VALUE measures", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [],
      measures: [
        { id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" },
        { id: "__count:sum", fieldName: "__count", aggregator: "sum" },
      ],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition("=PIVOT.VALUE(1,");
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        description: "Expected Revenue",
        fuzzySearchKey: 'Expected RevenueExpected Revenue"Expected Revenue:sum"',
        htmlContent: [{ color: "#00a82d", value: '"Expected Revenue:sum"' }],
        text: '"Expected Revenue:sum"',
      },
      {
        description: "Count",
        fuzzySearchKey: 'Count"__count"',
        htmlContent: [{ color: "#00a82d", value: '"__count"' }],
        text: '"__count"',
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.VALUE(1,"Expected Revenue:sum"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE measure with the pivot id as a string", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE("1",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Expected Revenue:sum"']);
  });

  test("PIVOT.VALUE measure with pivot id that does not exist", async () => {
    const model = createModelWithPivot("A1:I5");
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition(`=PIVOT.VALUE(9999,`);
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE measure without any pivot id", async () => {
    const model = createModelWithPivot("A1:I5");
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition(`=PIVOT.VALUE(,`);
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE group with a single col group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ fieldName: "Stage" }],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      columns: [{ fieldName: "Stage" }],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE("1","Expected Revenue",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Stage"']);
  });

  test("PIVOT.VALUE group with a single row group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      rows: [{ fieldName: "Created on", granularity: "day" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","sta');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Stage"']);
  });

  test("PIVOT.VALUE search field with both col and row group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ fieldName: "Stage" }],
      rows: [{ fieldName: "Created on", granularity: "month_number" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      columns: [{ fieldName: "Created on", granularity: "month_number" }],
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      columns: [{ fieldName: "Created on", granularity: "month_number" }],
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Stage",1,');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Created on:month_number"']);
  });

  test("PIVOT.VALUE group with two rows, on the first group", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      rows: [{ fieldName: "Stage" }, { fieldName: "Created on", granularity: "month_number" }],
      columns: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      rows: [{ fieldName: "Created on", granularity: "month_number" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      rows: [{ fieldName: "Created on", granularity: "quarter_number" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      rows: [{ fieldName: "Created on", granularity: "day_of_month" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      rows: [{ fieldName: "Created on", granularity: "iso_week_number" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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

  test("PIVOT.VALUE autocomplete date day_of_week field for group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Created on", granularity: "day_of_week" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:day_of_week",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toHaveLength(7);
    expect(autoComplete?.proposals[0]).toEqual({
      description: "",
      fuzzySearchKey: "1",
      htmlContent: [{ color: "#02c39a", value: "1" }],
      text: "1",
    });
    expect(autoComplete?.proposals[6]).toEqual({
      description: "",
      fuzzySearchKey: "7",
      htmlContent: [{ color: "#02c39a", value: "7" }],
      text: "7",
    });
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe(
      '=PIVOT.VALUE(1,"Expected Revenue","Created on:day_of_week",1'
    );
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE autocomplete date hour_number field for group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Created on", granularity: "hour_number" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:hour_number",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toHaveLength(24);
    expect(autoComplete?.proposals[0]).toEqual({
      description: "",
      fuzzySearchKey: "0",
      htmlContent: [{ color: "#02c39a", value: "0" }],
      text: "0",
    });
    expect(autoComplete?.proposals[23]).toEqual({
      description: "",
      fuzzySearchKey: "23",
      htmlContent: [{ color: "#02c39a", value: "23" }],
      text: "23",
    });
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe(
      '=PIVOT.VALUE(1,"Expected Revenue","Created on:hour_number",0'
    );
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE autocomplete date minute_number field for group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Created on", granularity: "minute_number" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:minute_number",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toHaveLength(60);
    expect(autoComplete?.proposals[0]).toEqual({
      description: "",
      fuzzySearchKey: "0",
      htmlContent: [{ color: "#02c39a", value: "0" }],
      text: "0",
    });
    expect(autoComplete?.proposals[59]).toEqual({
      description: "",
      fuzzySearchKey: "59",
      htmlContent: [{ color: "#02c39a", value: "59" }],
      text: "59",
    });
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe(
      '=PIVOT.VALUE(1,"Expected Revenue","Created on:minute_number",0'
    );
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE autocomplete date second_number field for group value", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Created on", granularity: "second_number" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:second_number",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toHaveLength(60);
    expect(autoComplete?.proposals[0]).toEqual({
      description: "",
      fuzzySearchKey: "0",
      htmlContent: [{ color: "#02c39a", value: "0" }],
      text: "0",
    });
    expect(autoComplete?.proposals[59]).toEqual({
      description: "",
      fuzzySearchKey: "59",
      htmlContent: [{ color: "#02c39a", value: "59" }],
      text: "59",
    });
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe(
      '=PIVOT.VALUE(1,"Expected Revenue","Created on:second_number",0'
    );
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.VALUE autocomplete field after a date field", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ fieldName: "Stage" }],
      rows: [{ fieldName: "Created on", granularity: "month_number" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","Created on:month_number",11,');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"Stage"']);
  });

  test("PIVOT.VALUE no autocomplete value for wrong group field", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.VALUE(1,"Expected Revenue","not a dimension",');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("PIVOT.HEADER first field", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [{ fieldName: "Stage" }],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      columns: [{ fieldName: "Stage" }],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
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
      columns: [{ fieldName: "Stage" }],
      rows: [],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const { store: composer } = makeStoreWithModel(model, CellComposerStore);
    composer.startEdition('=PIVOT.HEADER(1,"Stage",');
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals.map((p) => p.text)).toEqual(['"New"', '"Won"']);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe('=PIVOT.HEADER(1,"Stage","New"');
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("auto complete measure from stand alone composer", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [],
      measures: [
        { id: "Stage:count", fieldName: "Stage", aggregator: "count" },
        {
          id: "Expected Revenue:sum",
          fieldName: "Expected Revenue",
          aggregator: "sum",
          userDefinedName: "The revenue",
        },
      ],
    });
    const pivot = model.getters.getPivot("1");
    const { store: composer } = makeStoreWithModel(model, StandaloneComposerStore, () => ({
      content: "=1+E",
      defaultRangeSheetId: model.getters.getActiveSheetId(),
      onConfirm: () => {},
      contextualAutocomplete: createMeasureAutoComplete(
        pivot.definition,
        pivot.getMeasure("Stage:count")
      ),
    }));
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        text: "'Expected Revenue:sum'",
        description: "The revenue",
        fuzzySearchKey: "The revenue'Expected Revenue:sum'Expected Revenue",
        htmlContent: [{ color: "#4a4e4d", value: "'Expected Revenue:sum'" }],
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe("=1+'Expected Revenue:sum'");
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("auto complete dimension from stand alone composer", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const pivot = model.getters.getPivot("1");
    const { store: composer } = makeStoreWithModel(model, StandaloneComposerStore, () => ({
      content: "=1+S",
      defaultRangeSheetId: model.getters.getActiveSheetId(),
      onConfirm: () => {},
      contextualAutocomplete: createMeasureAutoComplete(
        pivot.definition,
        pivot.getMeasure("Expected Revenue:sum")
      ),
    }));
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        text: "Stage",
        description: "Stage",
        fuzzySearchKey: "StageStageStage",
        htmlContent: [{ color: "#4a4e4d", value: "Stage" }],
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe("=1+Stage");
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("auto complete dimension starting with the cursor after an operator token", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const pivot = model.getters.getPivot("1");
    const { store: composer } = makeStoreWithModel(model, StandaloneComposerStore, () => ({
      content: "=",
      defaultRangeSheetId: model.getters.getActiveSheetId(),
      onConfirm: () => {},
      contextualAutocomplete: createMeasureAutoComplete(
        pivot.definition,
        pivot.getMeasure("Expected Revenue:sum")
      ),
    }));
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        text: "Stage",
        description: "Stage",
        fuzzySearchKey: "StageStageStage",
        htmlContent: [{ color: "#4a4e4d", value: "Stage" }],
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe("=Stage");
    expect(composer.autocompleteProvider).toBeUndefined();
  });

  test("auto complete dimension with cursor after an operator token", async () => {
    const model = createModelWithPivot("A1:I5");
    updatePivot(model, "1", {
      columns: [],
      rows: [{ fieldName: "Stage" }],
      measures: [{ id: "Expected Revenue:sum", fieldName: "Expected Revenue", aggregator: "sum" }],
    });
    const pivot = model.getters.getPivot("1");
    const { store: composer } = makeStoreWithModel(model, StandaloneComposerStore, () => ({
      content: "=0",
      defaultRangeSheetId: model.getters.getActiveSheetId(),
      onConfirm: () => {},
      contextualAutocomplete: createMeasureAutoComplete(
        pivot.definition,
        pivot.getMeasure("Expected Revenue:sum")
      ),
    }));
    composer.startEdition();
    composer.setCurrentContent("="); // simulate a backspace to delete the "0"
    const autoComplete = composer.autocompleteProvider;
    expect(autoComplete?.proposals).toEqual([
      {
        text: "Stage",
        description: "Stage",
        fuzzySearchKey: "StageStageStage",
        htmlContent: [{ color: "#4a4e4d", value: "Stage" }],
      },
    ]);
    autoComplete?.selectProposal(autoComplete?.proposals[0].text);
    expect(composer.currentContent).toBe("=Stage");
    expect(composer.autocompleteProvider).toBeUndefined();
  });
});
