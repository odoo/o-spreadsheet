import { AddDimensionButton } from "../../src/components/side_panel/pivot/pivot_layout_configurator/add_dimension_button/add_dimension_button";
import { click, keyDown, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../test_helpers/helpers";

async function mountAddDimensionButton(
  props: Partial<AddDimensionButton["props"]>
): Promise<{ component: AddDimensionButton; fixture: HTMLElement }> {
  const { parent, fixture } = await mountComponentWithPortalTarget(AddDimensionButton, {
    props: {
      fields: [],
      onFieldPicked: () => {},
      ...props,
    },
  });
  return { component: parent as unknown as AddDimensionButton, fixture };
}

describe("Add dimension button", () => {
  test("Can navigate with arrow keys", async () => {
    const onFieldPicked = jest.fn();
    const { fixture } = await mountAddDimensionButton({
      fields: [
        { name: "Amount", type: "integer", string: "Amount" },
        { name: "Product", type: "char", string: "Product" },
      ],
      onFieldPicked,
    });
    await click(fixture.querySelector(".add-dimension")!);
    let options = [...fixture.querySelectorAll(".o-popover .o-autocomplete-dropdown > div")];
    expect(
      options.every((el) => !el.className.includes("o-autocomplete-value-focus"))
    ).toBeTruthy();
    await keyDown({ key: "ArrowDown" });
    options = [...fixture.querySelectorAll(".o-popover .o-autocomplete-dropdown > div")];
    expect(options[0].className.includes("o-autocomplete-value-focus")).toBeTruthy();
    expect(options[1].className.includes("o-autocomplete-value-focus")).toBeFalsy();

    await keyDown({ key: "ArrowDown" });
    options = [...fixture.querySelectorAll(".o-popover .o-autocomplete-dropdown > div")];
    expect(options[0].className.includes("o-autocomplete-value-focus")).toBeFalsy();
    expect(options[1].className.includes("o-autocomplete-value-focus")).toBeTruthy();

    await keyDown({ key: "ArrowUp" });
    options = [...fixture.querySelectorAll(".o-popover .o-autocomplete-dropdown > div")];
    expect(options[0].className.includes("o-autocomplete-value-focus")).toBeTruthy();
    expect(options[1].className.includes("o-autocomplete-value-focus")).toBeFalsy();

    await keyDown({ key: "Enter" });
    expect(onFieldPicked).toHaveBeenCalledWith("Amount");
  });

  test("Can fuzzy lookup on name and string", async () => {
    const onFieldPicked = jest.fn();
    const { fixture } = await mountAddDimensionButton({
      fields: [
        { name: "technical", type: "integer", string: "Amount" },
        { name: "Product", type: "char", string: "Product" },
      ],
      onFieldPicked,
    });
    await click(fixture.querySelector(".add-dimension")!);
    await setInputValueAndTrigger(fixture.querySelector("input")!, "tech");
    const options = [...fixture.querySelectorAll(".o-popover .o-autocomplete-dropdown > div")];
    expect(options.length).toBe(1);
    expect(options[0].textContent?.trim()).toBe("Amount");
  });
});
