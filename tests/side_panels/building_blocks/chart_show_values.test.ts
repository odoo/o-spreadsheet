import { ChartShowValues } from "../../../src/components/side_panel/chart/building_blocks/show_values/show_values";
import { DispatchResult, UID } from "../../../src/types";
import { setInputValueAndTrigger, simulateClick } from "../../test_helpers/dom_helper";
import { mountComponent } from "../../test_helpers/helpers";

async function mountChartShowValues(props: Partial<ChartShowValues["props"]>) {
  const defaultProps: ChartShowValues["props"] = {
    chartId: "chart-id" as UID,
    definition: {
      showValues: false,
    },
    updateChart: () => DispatchResult.Success,
    canUpdateChart: () => DispatchResult.Success,
    defaultValue: false,
  };
  return mountComponent(ChartShowValues, {
    props: { ...defaultProps, ...props },
  });
}

const chartId = "chart-id" as UID;

describe("ChartShowValues", () => {
  test("reflects the showValues state from the chart definition", async () => {
    const { fixture } = await mountChartShowValues({
      chartId,
      definition: { showValues: true },
    });

    const checkbox = fixture.querySelector("input[type='checkbox']") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  test("uses the default falsy value when the definition does not specify showValues", async () => {
    const { fixture } = await mountChartShowValues({
      chartId,
      definition: {},
    });

    const checkbox = fixture.querySelector("input[type='checkbox']") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  test("updates the chart when the checkbox value changes", async () => {
    const updateChart = jest.fn();
    await mountChartShowValues({
      chartId,
      definition: { showValues: false },
      updateChart,
    });

    await simulateClick("input[type='checkbox']");
    expect(updateChart).toHaveBeenCalledWith(chartId, { showValues: true });

    await simulateClick("input[type='checkbox']");
    expect(updateChart).toHaveBeenCalledWith(chartId, { showValues: false });
  });

  test("can change the mode when modes and onModeChanged props are provided", async () => {
    const onModeChanged = jest.fn();
    const modes = [
      { value: "value", label: "As Value" },
      { value: "label", label: "As Label" },
    ];
    const { fixture } = await mountChartShowValues({
      chartId,
      definition: { showValues: true, showValuesMode: "value" },
      modes,
      onModeChanged,
    });

    const select = fixture.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("value");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe("value");
    expect(options[0].textContent).toBe("As Value");
    expect(options[1].value).toBe("label");
    expect(options[1].textContent).toBe("As Label");

    await setInputValueAndTrigger(select, "label");
    expect(onModeChanged).toHaveBeenCalledWith("label");
  });

  test("does not render the mode selector when modes prop is empty", async () => {
    const onModeChanged = jest.fn();
    const { fixture } = await mountChartShowValues({
      chartId,
      definition: { showValues: true, showValuesMode: "value" },
      modes: [],
      onModeChanged,
    });

    const select = fixture.querySelector("select") as HTMLSelectElement;
    expect(select).toBeFalsy();
  });

  test("does not render the mode selector when onModeChanged prop is not provided", async () => {
    const modes = [
      { value: "value", label: "As Value" },
      { value: "label", label: "As Label" },
    ];
    const { fixture } = await mountChartShowValues({
      chartId,
      definition: { showValues: true, showValuesMode: "value" },
      modes,
    });

    const select = fixture.querySelector("select") as HTMLSelectElement;
    expect(select).toBeFalsy();
  });
});
