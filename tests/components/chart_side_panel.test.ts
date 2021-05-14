import { Component, hooks, tags } from "@odoo/owl";
import { Model } from "../../src";
import { ChartPanel } from "../../src/components/side_panel/chart_panel";
import { CommandResult, Figure, SpreadsheetEnv } from "../../src/types";
import { setInputValueAndTrigger, simulateClick } from "../test_helpers/dom_helper";
import { makeTestFixture, mockUuidV4To, nextTick } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

const { xml } = tags;
const { useSubEnv } = hooks;

class Parent extends Component<any, SpreadsheetEnv> {
  static template = xml`<ChartPanel figure="figure"/>`;
  static components = { ChartPanel };

  constructor(model: Model, public figure?: Figure) {
    super();
    useSubEnv({
      dispatch: model.dispatch,
      getters: model.getters,
      _t: (s: string): string => s,
    });
  }
}

let fixture: HTMLElement;

async function createChartPanel(
  { model, figure }: { model: Model; figure?: Figure } = { model: new Model() }
) {
  const parent = new Parent(model, figure);
  fixture = makeTestFixture();
  await parent.mount(fixture);
  await nextTick();
  return { model, parent };
}

function errorMessages(): string[] {
  const errors = document.querySelectorAll(".o-sidepanel-error");
  if (!errors) return [];
  return [...errors]
    .map((error) => error.textContent)
    .filter((error): error is string => error !== null);
}

describe("Chart sidepanel component", () => {
  test("create a chart", async () => {
    const { parent, model } = await createChartPanel();

    setInputValueAndTrigger(".o-chart-title input", "My title", "input");
    await nextTick();
    setInputValueAndTrigger(".o-data-series input", "B1:B10", "change");
    await nextTick();
    setInputValueAndTrigger(".o-data-labels input", "A2:A10", "change");
    await nextTick();
    mockUuidV4To(42);
    parent.env.dispatch = jest.fn(() => CommandResult.Success);
    await simulateClick(".o-sidePanelButton");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("CREATE_CHART", {
      definition: {
        title: "My title",
        type: "bar",
        dataSetsHaveTitle: false,
        dataSets: ["B1:B10"],
        labelRange: "A2:A10",
      },
      id: "42",
      sheetId: model.getters.getActiveSheetId(),
    });
    parent.unmount();
  });

  // Skipped because updating of a chart is not yet supported
  test.skip("update chart", async () => {
    const model = new Model();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheetId(),
      definition: {
        title: "test 1",
        dataSets: ["B1:B4", "C1:C4"],
        dataSetsHaveTitle: true,
        labelRange: "A2:A4",
        type: "line",
      },
    });
    const [figure] = model.getters.getVisibleFigures(model.getters.getActiveSheetId()) as Figure[];
    const { parent } = await createChartPanel({ model, figure });
    parent.env.dispatch = jest.fn(() => CommandResult.Success);
    await simulateClick(".o-sidePanelButton");
    expect(parent.env.dispatch).toHaveBeenCalledWith("UPDATE_CHART", {
      definition: {
        title: "test 1",
        type: "line",
        dataSetsHaveTitle: false,
        dataSets: ["B2:B4", "C2:C4"],
        labelRange: "A2:A4",
      },
      id: "1",
    });
    setInputValueAndTrigger(".o-chart-title input", "My new title", "input");
    await nextTick();
    setInputValueAndTrigger(".o-data-series input", "B1:B10", "change");
    await nextTick();
    setInputValueAndTrigger(".o-data-labels input", "A2:A10", "change");
    await simulateClick(".o-sidePanelButton");
    expect(parent.env.dispatch).toHaveBeenCalledWith("UPDATE_CHART", {
      definition: {
        title: "My new title",
        type: "line",
        dataSetsHaveTitle: true,
        dataSets: ["B1:B10", "C2:C4"],
        labelRange: "A2:A10",
      },
      id: "1",
    });
    parent.unmount();
  });

  test("create chart with invalid dataset and empty labels", async () => {
    const { parent } = await createChartPanel();
    await simulateClick(".o-data-series input");
    setInputValueAndTrigger(".o-data-series input", "This is not valid", "change");
    await simulateClick(".o-sidePanelButton");
    await nextTick();
    expect(errorMessages()).toEqual(["Invalid dataSet"]);
    parent.destroy();
  });
});
