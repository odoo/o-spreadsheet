import { ChartLabelRange } from "../../../src/components/side_panel/chart/building_blocks/label_range/label_range";
import { mountComponent } from "../../test_helpers/helpers";

let fixture: HTMLElement;

async function mountLabelRange(props: ChartLabelRange["props"]) {
  ({ fixture } = await mountComponent(ChartLabelRange, { props }));
}

describe("Label range", () => {
  test("Can render a label range component", async () => {
    await mountLabelRange({
      range: "A1:B1",
      isInvalid: false,
      onSelectionChanged: () => {},
      onSelectionConfirmed: () => {},
    });
    expect(fixture).toMatchSnapshot();
  });

  test("Can add options to the label range component", async () => {
    await mountLabelRange({
      range: "A1:B1",
      isInvalid: false,
      onSelectionChanged: () => {},
      onSelectionConfirmed: () => {},
      options: [
        {
          name: "my_option",
          label: "My option",
          value: true,
          onChange: () => {},
        },
      ],
    });
    expect(fixture).toMatchSnapshot();
  });

  test("Can make the label range required", async () => {
    await mountLabelRange({
      range: "A1:B1",
      isInvalid: false,
      onSelectionChanged: () => {},
      onSelectionConfirmed: () => {},
      required: true,
    });
    expect(fixture.querySelector(".o-selection-input input")?.classList).toContain("o-required");
  });
});
