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

test("0 as key", () => {
  const state = {
    sheet: {
      rows: [{ cells: { 0: 1 } }],
    },
  };
  const updated = produce(state, (draft) => {
    draft.sheet.rows[0].cells[2] = 3;
    draft.sheet.rows.push({ cells: { 0: 5 } });
  });
  const updatedTwice = produce(state, (draft) => {
    draft.sheet.rows[0].cells[2] = 3;
    draft.sheet.rows.push({ cells: { 0: 5 } });
  });
  console.log(updated);
  console.log(updatedTwice);
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
