import { Model } from "../../src";

let model: Model;
beforeEach(() => {
  model = new Model();
});

test("can add artifacts", () => {
  model.dispatch("CREATE_ARTIFACT", {
    artifactType: "placeholder",
    details: { text: "text of placeholder" },
  });
  expect(model.getters.getArtifacts(model.getters.getActiveSheet())).toEqual([
    {
      artifactType: "placeholder",
      details: { text: "text of placeholder" },
    },
  ]);
});

describe("can select artifacts", () => {});

describe("can move artifacts", () => {});

describe("artifacts move with the grid", () => {
  // resize column
  // resize row
  // remove columns
  // remove row
  // add column
  // add row
  //scroll left to right
  // scroll up to down
  // artifacts that are outside the view port
});

describe("only artifacts of the active sheet are visible", () => {});
