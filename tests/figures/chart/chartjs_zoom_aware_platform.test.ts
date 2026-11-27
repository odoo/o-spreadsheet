import { createChart } from "../../test_helpers/commands_helpers";
import { mountSpreadsheet, nextTick } from "../../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../../test_helpers/mock_helpers";

/** CSS zoom changes the bounding rect of the container, not its layout size */
function mockContainerSize(className: string, width: number, height: number, zoom: number) {
  for (const [property, size] of [
    ["clientWidth", width],
    ["clientHeight", height],
  ] as const) {
    const spy = jest.spyOn(HTMLDivElement.prototype, property, "get");
    // keep the default size mocked in jest.setup.ts for the other elements
    const defaultSize = spy.getMockImplementation()!;
    spy.mockImplementation(function (this: HTMLDivElement) {
      return this.classList.contains(className) ? size : defaultSize.call(this);
    });
  }
  extendMockGetBoundingClientRect({
    [className]: () => ({ width: width * zoom, height: height * zoom }),
  });
}

function getCanvasSize(canvas: HTMLCanvasElement) {
  return { width: canvas.style.width, height: canvas.style.height };
}

test.each([0.5, 2])("Chart is sized from its container layout size at zoom %s", async (zoom) => {
  mockContainerSize("o-chart-container", 400, 300, zoom);
  const { model, fixture } = await mountSpreadsheet();
  model.dispatch("SET_ZOOM", { zoom });
  createChart(model, { type: "pie" });
  await nextTick();
  const canvas = fixture.querySelector<HTMLCanvasElement>(".o-figure-canvas")!;
  expect(getCanvasSize(canvas)).toEqual({ width: "400px", height: "300px" });
});

test.each([0.5, 2])(
  "Zoomable chart slicer is sized from its container layout size at zoom %s",
  async (zoom) => {
    mockContainerSize("o-master-chart-container", 400, 60, zoom);
    const { model, fixture } = await mountSpreadsheet();
    model.dispatch("SET_ZOOM", { zoom });
    createChart(model, { type: "line", zoomable: true });
    await nextTick();
    const canvas = fixture.querySelector<HTMLCanvasElement>(".o-master-chart-canvas")!;
    expect(getCanvasSize(canvas)).toEqual({ width: "400px", height: "60px" });
  }
);
