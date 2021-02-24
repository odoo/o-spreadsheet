import { Component, hooks, tags } from "@odoo/owl";
import { Model } from "../../src";
import { ChartPanel } from "../../src/components/side_panel/chart_panel";
import { ChartFigure, SpreadsheetEnv, Viewport } from "../../src/types";
import "../canvas.mock";
import { setInputValueAndTrigger, simulateClick } from "../dom_helper";
import { makeTestFixture, mockUuidV4To, nextTick } from "../helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

const { xml } = tags;
const { useSubEnv } = hooks;

class Parent extends Component<any, SpreadsheetEnv> {
  static template = xml`<ChartPanel figure="figure"/>`;
  static components = { ChartPanel };

  constructor(model: Model, public figure?: ChartFigure) {
    super();
    useSubEnv({
      dispatch: model.dispatch,
      getters: model.getters,
      _t: (s: string): string => s,
    });
  }
}

const viewport: Viewport = {
  bottom: 1000,
  right: 1000,
  left: 0,
  top: 0,
  height: 1000,
  width: 1000,
  offsetX: 0,
  offsetY: 0,
};
let fixture: HTMLElement;

async function createChartPanel(
  { model, figure }: { model: Model; figure?: ChartFigure } = { model: new Model() }
) {
  const parent = new Parent(model, figure);
  fixture = makeTestFixture();
  await parent.mount(fixture);
  await nextTick();
  return { model, parent };
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
    parent.env.dispatch = jest.fn(() => ({ status: "SUCCESS" }));
    await simulateClick(".o-sidePanelButton");
    await nextTick();
    expect(parent.env.dispatch).toHaveBeenCalledWith("CREATE_CHART", {
      definition: {
        title: "My title",
        type: "bar",
        seriesHasTitle: false,
        dataSets: ["B1:B10"],
        labelRange: "A2:A10",
      },
      id: "42",
      sheetId: model.getters.getActiveSheet(),
    });
    parent.unmount();
  });

  // Skipped because updating of a chart is not yet supported
  test.skip("update chart", async () => {
    const model = new Model();
    model.dispatch("CREATE_CHART", {
      id: "1",
      sheetId: model.getters.getActiveSheet(),
      definition: {
        title: "test 1",
        dataSets: ["B1:B4", "C1:C4"],
        seriesHasTitle: true,
        labelRange: "A2:A4",
        type: "line",
      },
    });
    const [figure] = model.getters.getFigures(viewport) as ChartFigure[];
    const { parent } = await createChartPanel({ model, figure });
    parent.env.dispatch = jest.fn(() => ({ status: "SUCCESS" }));
    await simulateClick(".o-sidePanelButton");
    expect(parent.env.dispatch).toHaveBeenCalledWith("UPDATE_CHART", {
      definition: {
        title: "test 1",
        type: "line",
        seriesHasTitle: false,
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
        seriesHasTitle: true,
        dataSets: ["B1:B10", "C2:C4"],
        labelRange: "A2:A10",
      },
      id: "1",
    });
    parent.unmount();
  });
});
