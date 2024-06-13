import { Model, Spreadsheet } from "../../../src";
import { ChartTitle } from "../../../src/components/side_panel/chart/building_blocks/title/title";
import { BarChartDefinition } from "../../../src/types/chart";
import {
  activateSheet,
  copy,
  createChart,
  merge,
  paste,
} from "../../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger, simulateClick } from "../../test_helpers/dom_helper";
import { getCellContent } from "../../test_helpers/getters_helpers";
import {
  getRuntimeChartTitle,
  mockChart,
  mountComponentWithPortalTarget,
  mountSpreadsheet,
  nextTick,
} from "../../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let figureId: string = "figureId";
let parent: Spreadsheet;

const openChartConfigSidePanel = async (id = figureId): Promise<void> => {
  model.dispatch("SELECT_FIGURE", { id });
  parent.env.openSidePanel("ChartPanel");
  await nextTick();
};

const openChartDesignSidePanel = async (id = figureId): Promise<void> => {
  await openChartConfigSidePanel(id);
  await simulateClick(".o-panel-element.inactive");
};

async function mountChartTitle(props: ChartTitle["props"]) {
  ({ fixture } = await mountComponentWithPortalTarget(ChartTitle, { props }));
}

describe("Chart title", () => {
  test("Can render a chart title component", async () => {
    await mountChartTitle({
      title: { type: "string", text: "My title" },
      updateTitle: () => {},
      style: {},
    });
    expect(fixture).toMatchSnapshot();
  });

  test("Can render correctly with selection input for chart title", async () => {
    await mountChartTitle({
      title: { type: "reference", text: "A1" },
      updateTitle: () => {},
      style: {},
    });
    expect(fixture).toMatchSnapshot();
  });

  test("Update is called when title is changed, not on input", async () => {
    const updateTitle = jest.fn();
    await mountChartTitle({
      title: { type: "string", text: "My title" },
      updateTitle,
      style: {},
    });
    const input = fixture.querySelector("input")!;
    expect(input.value).toBe("My title");
    await setInputValueAndTrigger(input, "My new title", "onlyInput");
    expect(updateTitle).toHaveBeenCalledTimes(0);
    input.dispatchEvent(new Event("change"));
    expect(updateTitle).toHaveBeenCalledTimes(1);
  });

  test("UpdateColor is called when title color is changed", async () => {
    const updateColor = jest.fn();
    await mountChartTitle({
      title: { type: "string", text: "My title" },
      updateTitle: () => {},
      style: {},
      updateColor,
    });
    expect(updateColor).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-color-picker-button");
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(updateColor).toHaveBeenCalledWith("#EFEFEF");
  });

  test.each(["Left", "Center", "Right"])(
    "UpdateAlignment is called when alignment is changed",
    async (alignment: string) => {
      const updateAlignment = jest.fn();
      await mountChartTitle({
        title: { type: "string", text: "My title" },
        updateTitle: () => {},
        style: {},
        updateAlignment,
      });
      expect(updateAlignment).toHaveBeenCalledTimes(0);
      await click(fixture, ".o-menu-item-button[title='Horizontal alignment']");
      await click(fixture, `.o-menu-item-button[title='${alignment}']`);
      expect(updateAlignment).toHaveBeenCalledWith(alignment.toLowerCase());
    }
  );

  test("ToggleBold is called when clicking on bold button", async () => {
    const toggleBold = jest.fn();
    await mountChartTitle({
      title: { type: "string", text: "My title" },
      updateTitle: () => {},
      style: {},
      toggleBold,
    });
    expect(toggleBold).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Bold']");
    expect(toggleBold).toHaveBeenCalledTimes(1);
  });

  test("ToggleItalic is called when clicking on italic button", async () => {
    const toggleItalic = jest.fn();
    await mountChartTitle({
      title: { type: "string", text: "My title" },
      updateTitle: () => {},
      style: {},
      toggleItalic,
    });
    expect(toggleItalic).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Italic']");
    expect(toggleItalic).toHaveBeenCalledTimes(1);
  });
});

describe("Chart title with cell reference", () => {
  beforeEach(async () => {
    mockChart();
    const data = {
      sheets: [
        {
          name: "Sheet1",
          cells: {
            A1: { content: "Hello World" },
          },
        },
        {
          name: "Sheet2",
          cells: {
            A1: { content: "Hello Universe" },
          },
        },
      ],
    };
    ({ parent, model, fixture } = await mountSpreadsheet({ model: new Model(data) }));
  });

  test("Chart title type changes to 'reference' when checkbox is clicked", async () => {
    createChart(model, { title: { type: "string", text: "Hello World" }, type: "bar" }, figureId);
    await openChartDesignSidePanel();
    expect(model.getters.getChartDefinition(figureId).title.type).toBe("string");

    await simulateClick(".o-chart-title input[type='checkbox']");
    expect(model.getters.getChartDefinition(figureId).title.type).toBe("reference");
  });

  test("Axis title type changes to 'reference' when checkbox is clicked", async () => {
    createChart(
      model,
      {
        type: "bar",
        axesDesign: { x: { type: "string", text: "X axis" } },
      },
      figureId
    );
    await openChartDesignSidePanel();
    let definition = model.getters.getChartDefinition(figureId) as BarChartDefinition;
    expect(definition.axesDesign?.x?.type).toBe("string");

    const checkbox = fixture.querySelectorAll(".o-chart-title input[type='checkbox']")[1];
    await simulateClick(checkbox);

    definition = model.getters.getChartDefinition(figureId) as BarChartDefinition;
    expect(definition.axesDesign?.x?.type).toBe("reference");
  });

  test("Renders selection input when checkbox for chart title is clicked in the design panel", async () => {
    createChart(model, { title: { type: "string", text: "Hello World" }, type: "bar" }, figureId);
    await openChartDesignSidePanel();
    expect(fixture.querySelector(".o-chart-title .o-selection")).toBeFalsy();

    await simulateClick(".o-chart-title input[type='checkbox']");
    expect(fixture.querySelector(".o-chart-title .o-selection")).toBeTruthy();
  });

  test("Renders selection input when checkbox for axis title is clicked in the design panel", async () => {
    createChart(
      model,
      {
        type: "bar",
        axesDesign: { x: { type: "string", text: "X axis" } },
      },
      figureId
    );
    await openChartDesignSidePanel();
    expect(fixture.querySelector(".o-chart-title .o-selection")).toBeFalsy();

    const checkbox = fixture.querySelectorAll(".o-chart-title input[type='checkbox']")[1];
    await simulateClick(checkbox);
    expect(fixture.querySelector(".o-chart-title .o-selection")).toBeTruthy();
  });

  test("Chart title can be set to a cell reference", async () => {
    createChart(model, { title: { type: "string", text: "Bar Chart" }, type: "bar" }, figureId);
    await openChartDesignSidePanel();
    await simulateClick(".o-chart-title input[type='checkbox']");

    const inputElement = fixture.querySelector(
      ".o-chart-title .o-selection input"
    ) as HTMLInputElement;
    await setInputValueAndTrigger(inputElement, "A1");
    await simulateClick(".o-chart-title .o-selection-ok");

    expect(model.getters.getChartDefinition(figureId).title.text).toBe("A1");
    expect(model.getters.getChartDefinition(figureId).title.type).toBe("reference");
    expect(getRuntimeChartTitle(model, figureId)).toEqual(getCellContent(model, "A1"));
  });

  test("Axis title can be set to a cell reference", async () => {
    createChart(
      model,
      {
        type: "bar",
        axesDesign: { x: { type: "string", text: "X axis" } },
      },
      figureId
    );
    await openChartDesignSidePanel();
    const checkbox = fixture.querySelectorAll(".o-chart-title input[type='checkbox']")[1];
    await simulateClick(checkbox);

    const inputElement = fixture.querySelector(
      ".o-chart-title .o-selection input"
    ) as HTMLInputElement;
    await setInputValueAndTrigger(inputElement, "A1");
    await simulateClick(".o-chart-title .o-selection-ok");

    const definition = model.getters.getChartDefinition(figureId) as BarChartDefinition;
    expect(definition.axesDesign?.x?.text).toBe("A1");
    expect(definition.axesDesign?.x?.type).toBe("reference");
  });

  test("Chart title updates after copy/pasting to another sheet if title is a cell reference", async () => {
    activateSheet(model, "Sheet2");
    createChart(model, { title: { type: "reference", text: "A1" }, type: "bar" }, figureId);
    expect(getRuntimeChartTitle(model, figureId)).toEqual(getCellContent(model, "A1"));

    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    activateSheet(model, "Sheet1");
    paste(model, "A1");

    const newChartId = model.getters.getChartIds("Sheet1")[0];
    expect(model.getters.getChartDefinition(newChartId).title.text).toBe("Sheet2!A1");
    expect(getRuntimeChartTitle(model, newChartId)).toEqual("Hello Universe");
  });

  test("Axis title updates after copy/pasting to another sheet if title is a cell reference", async () => {
    activateSheet(model, "Sheet2");
    createChart(
      model,
      {
        type: "bar",
        axesDesign: { x: { type: "reference", text: "A1" } },
      },
      figureId
    );
    const definition = model.getters.getChartDefinition(figureId) as BarChartDefinition;
    expect(definition.axesDesign?.x?.text).toBe("A1");

    model.dispatch("SELECT_FIGURE", { id: figureId });
    copy(model);
    activateSheet(model, "Sheet1");
    paste(model, "A1");

    const newChartId = model.getters.getChartIds("Sheet1")[0];
    const newDefinition = model.getters.getChartDefinition(newChartId) as BarChartDefinition;
    expect(newDefinition.axesDesign?.x?.text).toBe("Sheet2!A1");
  });

  test("When title is a cell reference, clicking on the checkbox should update the title to cell content", async () => {
    createChart(model, { title: { type: "reference", text: "A1" }, type: "bar" }, figureId);
    await openChartDesignSidePanel();

    const inputElement = fixture.querySelector(
      ".o-chart-title .o-selection input"
    ) as HTMLInputElement;
    expect(inputElement.value).toBe("A1");

    await simulateClick(".o-chart-title input[type='checkbox']");

    expect(model.getters.getChartDefinition(figureId).title.text).toBe(getCellContent(model, "A1"));
    expect(getRuntimeChartTitle(model, figureId)).toEqual(getCellContent(model, "A1"));
  });

  test("When axis title is a cell reference, clicking on the checkbox should update the title to cell content", async () => {
    createChart(
      model,
      {
        type: "bar",
        axesDesign: { x: { type: "reference", text: "A1" } },
      },
      figureId
    );
    await openChartDesignSidePanel();

    const inputElement = fixture.querySelector(
      ".o-chart-title .o-selection input"
    ) as HTMLInputElement;
    expect(inputElement.value).toBe("A1");

    const checkbox = fixture.querySelectorAll(".o-chart-title input[type='checkbox']")[1];
    await simulateClick(checkbox);

    const definition = model.getters.getChartDefinition(figureId) as BarChartDefinition;
    expect(definition.axesDesign?.x?.text).toBe(getCellContent(model, "A1"));
  });

  test("Chart title displays correctly when referencing a merged cell", async () => {
    merge(model, "A1:A2");
    createChart(model, { title: { type: "reference", text: "A2" }, type: "bar" }, figureId);

    expect(getRuntimeChartTitle(model, figureId)).toEqual(getCellContent(model, "A1"));
    expect(model.getters.getChartDefinition(figureId).title.text).toBe("A2");
  });

  test("can edit chart title color", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { type: "string", text: "title" },
      },
      figureId
    );
    await openChartDesignSidePanel();

    const color_menu = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-color-picker-widget > .o-color-picker-button"
    )[0];

    await click(color_menu);
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(model.getters.getChartDefinition(figureId).title.design).toEqual({
      color: "#EFEFEF",
    });
  });

  test.each(["Left", "Center", "Right"])(
    "can edit chart title alignment",
    async (alignment: string) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "C1:C4" }],
          labelRange: "A2:A4",
          type: "line",
          title: { type: "string", text: "title" },
        },
        figureId
      );
      await openChartDesignSidePanel();
      const alignment_menu = fixture.querySelectorAll(
        ".o-chart-title-designer > .o-menu-item-button[title='Horizontal alignment']"
      )[0];

      await click(alignment_menu);
      await click(fixture, `.o-menu-item-button[title='${alignment}']`);
      expect(model.getters.getChartDefinition(figureId).title.design).toEqual({
        align: alignment.toLowerCase(),
      });
    }
  );

  test("can edit chart title style", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { type: "string", text: "title" },
      },
      figureId
    );
    await openChartDesignSidePanel();

    const bold_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Bold']"
    )[0];
    await click(bold_element);
    expect(model.getters.getChartDefinition(figureId).title.design).toEqual({
      bold: true,
    });

    const italic_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Italic']"
    )[0];
    await click(italic_element);
    expect(model.getters.getChartDefinition(figureId).title.design).toEqual({
      bold: true,
      italic: true,
    });
  });

  test("can edit chart axis title color", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
      },
      figureId
    );
    await openChartDesignSidePanel();

    const color_menu = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-color-picker-widget > .o-color-picker-button"
    )[1];

    await click(color_menu);
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    //@ts-ignore
    expect(model.getters.getChartDefinition(figureId).axesDesign.x.design).toEqual({
      color: "#EFEFEF",
    });
  });

  test.each(["Left", "Center", "Right"])(
    "can edit chart axis title alignment",
    async (alignment: string) => {
      createChart(
        model,
        {
          dataSets: [{ dataRange: "C1:C4" }],
          labelRange: "A2:A4",
          type: "line",
          title: { type: "string", text: "title" },
        },
        figureId
      );
      await openChartDesignSidePanel();
      const alignment_menu = fixture.querySelectorAll(
        ".o-chart-title-designer > .o-menu-item-button[title='Horizontal alignment']"
      )[1];

      await click(alignment_menu);
      await click(fixture, `.o-menu-item-button[title='${alignment}']`);
      //@ts-ignore
      expect(model.getters.getChartDefinition(figureId).axesDesign.x.design).toEqual({
        align: alignment.toLowerCase(),
      });
    }
  );

  test("can edit chart axis title style", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { type: "string", text: "title" },
      },
      figureId
    );
    await openChartDesignSidePanel();

    const bold_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Bold']"
    )[1];
    await click(bold_element);
    //@ts-ignore
    expect(model.getters.getChartDefinition(figureId).axesDesign.x.design).toEqual({
      bold: true,
    });

    const italic_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Italic']"
    )[1];
    await click(italic_element);
    //@ts-ignore
    expect(model.getters.getChartDefinition(figureId).axesDesign.x.design).toEqual({
      bold: true,
      italic: true,
    });
  });

  test("can edit multiple chart axis title style", async () => {
    createChart(
      model,
      {
        dataSets: [{ dataRange: "C1:C4" }],
        labelRange: "A2:A4",
        type: "line",
        title: { type: "string", text: "title" },
      },
      figureId
    );
    await openChartDesignSidePanel();

    const bold_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Bold']"
    )[1];
    await click(bold_element);
    //@ts-ignore
    expect(model.getters.getChartDefinition(figureId).axesDesign.x.design).toEqual({
      bold: true,
    });

    setInputValueAndTrigger(".o-axis-selector", "y");
    const italic_element = fixture.querySelectorAll(
      ".o-chart-title-designer > .o-menu-item-button[title='Italic']"
    )[1];
    await click(italic_element);
    //@ts-ignore
    expect(model.getters.getChartDefinition(figureId).axesDesign.x.design).toEqual({
      bold: true,
    });
    //@ts-ignore
    expect(model.getters.getChartDefinition(figureId).axesDesign.y.design).toEqual({
      italic: true,
    });
  });
});
