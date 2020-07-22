import "../canvas.mock";
//import { getCell } from "../helpers";
import { Zone } from "../../src/types";
import { Model } from "../../src";

let model: Model;

describe("Text figure plugin", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("can create a text figure", () => {
    model.dispatch("INSERT_TEXT", {
      id: "anId",
      text: "test",
      position: {
        top: 1,
        left: 1,
        right: 2,
        bottom: 2,
      },
    });

    const visibleZone: Zone = {
      top: 1,
      left: 1,
      bottom: 10,
      right: 10,
    };
    const visibleFigures = model.getters.getFiguresInside(
      model["workbook"].activeSheet.id,
      visibleZone
    );
    expect(visibleFigures).toHaveLength(1);
    expect(visibleFigures[0]).toMatchObject({
      id: "anId",
      text: "test",
      position: { top: 1, left: 1, right: 2, bottom: 2 },
    });
  });
});
