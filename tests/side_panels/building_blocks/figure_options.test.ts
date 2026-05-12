import { FigureOptions } from "../../../src/components/side_panel/chart/building_blocks/figure_options/figure_options";
import { Model } from "../../../src/model";
import { createFigure, simulateClick } from "../../test_helpers";
import { mountComponentWithPortalTarget } from "../../test_helpers/helpers";

let model: Model;
let sheetId: string;
const figureId = "figureId";

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
});

async function mountComponent(props: FigureOptions["props"]) {
  await mountComponentWithPortalTarget(FigureOptions, {
    props: { ...props },
    model,
  });
}

describe("Figure options", () => {
  test("Can add a shadow to the figure", async () => {
    createFigure(model, { figureId });
    await mountComponent({ figureId });

    expect("input[name='shadow']").toHaveValue(false);
    expect(model.getters.getFigure(sheetId, figureId)?.shadow).toBe(undefined);
    await simulateClick("input[name='shadow']");

    expect(model.getters.getFigure(sheetId, figureId)?.shadow).toBe(true);
    expect("input[name='shadow']").toHaveValue(true);
  });

  test("Can add rounded borders to the figure", async () => {
    createFigure(model, { figureId });
    await mountComponent({ figureId });

    expect("input[name='roundedBorders']").toHaveValue(false);
    expect(model.getters.getFigure(sheetId, figureId)?.roundedBorders).toBe(undefined);
    await simulateClick("input[name='roundedBorders']");

    expect(model.getters.getFigure(sheetId, figureId)?.roundedBorders).toBe(true);
    expect("input[name='roundedBorders']").toHaveValue(true);
  });
});
