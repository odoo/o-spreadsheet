import produce, { enablePatches } from "immer";
import { fromJS } from "immutable";

const cell = {
  content: "hello",
  dependencies: new Array(10000).fill(10),
  style: {
    fontColor: "red",
    format: "##0.0",
    border: {
      width: 10,
      color: "red",
    },
  },
};
enablePatches();

test("immer", () => {
  const updated = produce(
    cell,
    (draft) => {
      draft.style.border.width = 12;
    },
    (patch, inversePatch) => {
      console.log(patch);
      console.log(inversePatch);
      debugger;
    }
  );
  console.log(updated);
});

test("replace immer", () => {
  const updated = produce(
    cell,
    (draft) => {
      draft.style.border = { width: 10, color: "red" };
    },
    (patch, inversePatch) => {
      console.log(patch);
      console.log(inversePatch);
      debugger;
    }
  );
  console.log(updated);
});

test("immutable js", () => {
  const icell = fromJS(cell);
  // @ts-ignore
  const updated = icell.updateIn(["style", "border", "width"], () => 12);
  // const updated = icell.updateIn(["style", "border"], () => Map({ width: 12 }))
  console.log(updated);
});

test("deep array immutable js", () => {
  const icell = fromJS(cell);
  // @ts-ignore
  const updated = icell.updateIn(["dependencies", 0], () => 12);
  console.log(updated.get("dependencies").get(0));
});
