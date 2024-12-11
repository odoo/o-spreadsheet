import { CommandResult, Model, SpreadsheetChildEnv } from "../../../../src";
import { SidePanel } from "../../../../src/components/side_panel/side_panel/side_panel";
import { ChartTerms } from "../../../../src/components/translations_terms";
import { createGaugeChart, setInputValueAndTrigger, simulateClick } from "../../../test_helpers";
import {
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../../test_helpers/chart_helpers";
import { TEST_CHART_DATA } from "../../../test_helpers/constants";
import {
  editStandaloneComposer,
  mountComponentWithPortalTarget,
  textContentAll,
} from "../../../test_helpers/helpers";

jest.mock("../../../../src/components/composer/content_editable_helper", () =>
  require("../../../__mocks__/content_editable_helper")
);

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;
const chartId = "chartId";

beforeEach(async () => {
  model = new Model();
  createGaugeChart(model, TEST_CHART_DATA.gauge, chartId);
  ({ fixture, env } = await mountComponentWithPortalTarget(SidePanel, { model }));
  await openChartConfigSidePanel(model, env, chartId);
});

test("Can change gauge inflection operator", async () => {
  await openChartDesignSidePanel(model, env, fixture, chartId);
  expect(model.getters.getChartDefinition(chartId)).toMatchObject({
    sectionRule: {
      lowerInflectionPoint: { operator: "<=" },
      upperInflectionPoint: { operator: "<=" },
    },
  });

  const inputs = fixture.querySelectorAll(".o-input[name=operatorType]");

  await setInputValueAndTrigger(inputs[0], "<");
  expect(model.getters.getChartDefinition(chartId)).toMatchObject({
    sectionRule: {
      lowerInflectionPoint: { operator: "<" },
      upperInflectionPoint: { operator: "<=" },
    },
  });

  setInputValueAndTrigger(inputs[1], "<");
  expect(model.getters.getChartDefinition(chartId)).toMatchObject({
    sectionRule: {
      lowerInflectionPoint: { operator: "<" },
      upperInflectionPoint: { operator: "<" },
    },
  });
});

test("Can input formulas in gauge design values", async () => {
  await openChartDesignSidePanel(model, env, fixture, chartId);
  await editStandaloneComposer(".o-data-range-min .o-composer", "=1+1");
  await editStandaloneComposer(".o-data-range-max .o-composer", "=10*20");
  await editStandaloneComposer(".lowerInflectionPoint .o-composer", "=10/2");
  await editStandaloneComposer(".upperInflectionPoint .o-composer", "=10^2");

  expect(model.getters.getChartDefinition(chartId)).toMatchObject({
    sectionRule: {
      rangeMin: "=1+1",
      rangeMax: "=10*20",
      lowerInflectionPoint: { value: "=10/2" },
      upperInflectionPoint: { value: "=10^2" },
    },
  });
});

describe("update chart with invalid section rule", () => {
  test("empty dataRange", async () => {
    await simulateClick(".o-data-series input");
    await setInputValueAndTrigger(".o-data-series input", "");
    await simulateClick(".o-data-series .o-selection-ok");
    expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
  });

  test("empty rangeMin", async () => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await editStandaloneComposer(".o-data-range-min .o-composer", "");
    expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.EmptyGaugeRangeMin].toString()
    );
  });

  test.each(["bla bla bla", '=TRIM("  ok  ")'])("NaN rangeMin %s", async (content) => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await editStandaloneComposer(".o-data-range-min .o-composer", content);
    expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.GaugeRangeMinNaN].toString()
    );
  });

  test("empty rangeMax", async () => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await editStandaloneComposer(".o-data-range-max .o-composer", "");
    expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.EmptyGaugeRangeMax].toString()
    );
  });

  test.each(["bla bla bla", '="This is not a number"'])("NaN rangeMin %s", async (content) => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await editStandaloneComposer(".o-data-range-max .o-composer", content);
    expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.GaugeRangeMaxNaN].toString()
    );
  });

  test.each(["bla bla bla", "=)))invalid formula((("])("NaN rangeMin %s", async (content) => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await editStandaloneComposer(".lowerInflectionPoint .o-composer", content);
    expect(document.querySelector(".lowerInflectionPoint")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.GaugeLowerInflectionPointNaN].toString()
    );
  });

  test.each(["bla bla bla", "=#ERROR"])("NaN rangeMin %s", async (content) => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await editStandaloneComposer(".upperInflectionPoint .o-composer", "bla bla bla");
    expect(document.querySelector(".upperInflectionPoint")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.GaugeUpperInflectionPointNaN].toString()
    );
  });
});
