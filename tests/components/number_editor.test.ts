import { NumberEditor } from "../../src/components/number_editor/number_editor";
import { click, keyDown, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick } from "../test_helpers/helpers";

type Props = NumberEditor["props"];

function getInput(): HTMLInputElement {
  return document.querySelector("input")!;
}

async function mountNumberEditor(partialProps: Partial<Props> = {}) {
  const onValueChange = jest.fn();
  const props: Props = {
    currentValue: 100,
    class: "",
    min: 50,
    max: 200,
    title: "Zoom",
    valueList: [50, 100, 150, 200],
    onValueChange,
    ...partialProps,
  };
  await mountComponentWithPortalTarget(NumberEditor, { props });
  return onValueChange;
}

describe("NumberEditor component", () => {
  test("renders the current value", async () => {
    await mountNumberEditor();
    expect("input").toHaveValue("100");
  });

  test("focusing the input opens the value list", async () => {
    await mountNumberEditor();
    expect(".o-text-options").toHaveCount(0);
    getInput().focus();
    await nextTick();
    expect(".o-text-options").toHaveCount(1);
  });

  test("clicking a value in the list commits it and closes the list", async () => {
    const onValueChange = await mountNumberEditor();
    getInput().focus();
    await nextTick();
    await click(document.body, '[data-size="200"]');
    expect(onValueChange).toHaveBeenCalledWith(200);
    expect(".o-text-options").toHaveCount(0);
  });

  describe.each([["Enter"], ["Tab"]])("pressing %s", (key) => {
    test.each([
      ["150", 150], // within range, unchanged
      ["149.6", 150], // rounded to the nearest integer
      ["10", 50], // clipped to the min
      ["999", 200], // clipped to the max
    ])("with %s commits %d and closes the list", async (typed, expected) => {
      const onValueChange = await mountNumberEditor();
      const input = getInput();
      input.focus();
      await nextTick();
      input.value = typed;
      await keyDown({ key });
      expect(onValueChange).toHaveBeenCalledWith(expected);
      expect("input").toHaveValue(`${expected}`);
      expect(".o-text-options").toHaveCount(0);
    });

    test("with an empty value does not commit anything and keeps the list open", async () => {
      const onValueChange = await mountNumberEditor();
      const input = getInput();
      input.focus();
      await nextTick();
      input.value = "";
      await keyDown({ key });
      expect(onValueChange).not.toHaveBeenCalled();
      expect(".o-text-options").toHaveCount(1);
    });
  });

  test("pressing Escape resets the input to the current value and closes the list", async () => {
    const onValueChange = await mountNumberEditor();
    const input = getInput();
    input.focus();
    await nextTick();
    input.value = "175";
    await keyDown({ key: "Escape" });
    expect("input").toHaveValue("100");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(".o-text-options").toHaveCount(0);
  });

  test("changing the input value (e.g. on blur) commits the rounded, clipped value", async () => {
    const onValueChange = await mountNumberEditor();
    await setInputValueAndTrigger(getInput(), "75.5", "onlyChange");
    expect(onValueChange).toHaveBeenCalledWith(76);
  });
});
