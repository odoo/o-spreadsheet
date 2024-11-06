import { CommandResult, Model, SpreadsheetChildEnv } from "../../../../src";
import { SidePanel } from "../../../../src/components/side_panel/side_panel/side_panel";
import { ChartTerms } from "../../../../src/components/translations_terms";
import { createGaugeChart, setInputValueAndTrigger, simulateClick } from "../../../test_helpers";
import {
  openChartConfigSidePanel,
  openChartDesignSidePanel,
} from "../../../test_helpers/chart_helpers";
import { TEST_CHART_DATA } from "../../../test_helpers/constants";
import { mountComponentWithPortalTarget, textContentAll } from "../../../test_helpers/helpers";

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

describe("update chart with invalid section rule", () => {
  test("empty dataRange", async () => {
    await simulateClick(".o-data-series input");
    await setInputValueAndTrigger(".o-data-series input", "");
    await simulateClick(".o-data-series .o-selection-ok");
    expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
  });

  test("empty rangeMin", async () => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await setInputValueAndTrigger(".o-data-range-min", "");
    expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.EmptyGaugeRangeMin].toString()
    );
  });

  test("NaN rangeMin", async () => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await setInputValueAndTrigger(".o-data-range-min", "bla bla bla");
    expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.GaugeRangeMinNaN].toString()
    );
  });

  test("empty rangeMax", async () => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await setInputValueAndTrigger(".o-data-range-max", "");
    expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.EmptyGaugeRangeMax].toString()
    );
  });

  test("NaN rangeMax", async () => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await setInputValueAndTrigger(".o-data-range-max", "bla bla bla");
    expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.GaugeRangeMaxNaN].toString()
    );
  });

  test("rangeMin > rangeMax", async () => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    setInputValueAndTrigger(".o-data-range-min", "100");

    await setInputValueAndTrigger(".o-data-range-max", "0");
    expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
    expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.GaugeRangeMinBiggerThanRangeMax].toString()
    );
  });

  test("NaN LowerInflectionPoint", async () => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await setInputValueAndTrigger(".o-input-lowerInflectionPoint", "bla bla bla");
    expect(document.querySelector(".o-input-lowerInflectionPoint")?.classList).toContain(
      "o-invalid"
    );
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.GaugeLowerInflectionPointNaN].toString()
    );
  });

  test("NaN UpperInflectionPoint", async () => {
    await openChartDesignSidePanel(model, env, fixture, chartId);
    await setInputValueAndTrigger(".o-input-upperInflectionPoint", "bla bla bla");
    expect(document.querySelector(".o-input-upperInflectionPoint")?.classList).toContain(
      "o-invalid"
    );
    expect(textContentAll(".o-validation-error")[0]).toEqual(
      ChartTerms.Errors[CommandResult.GaugeUpperInflectionPointNaN].toString()
    );
  });
});
