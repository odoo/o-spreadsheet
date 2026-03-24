import { ColorScalePicker } from "../../../src/components/side_panel/chart/building_blocks/color_scale/color_scale_picker";
import { click, triggerMouseEvent } from "../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick } from "../../test_helpers/helpers";

let fixture: HTMLElement;

describe("ColorScalePicker", () => {
  test("closes on right-click", async () => {
    ({ fixture } = await mountComponentWithPortalTarget(ColorScalePicker, {
      props: {
        definition: {
          colorScale: {
            midColor: "#ffffff",
            minColor: "#ffffff",
            maxColor: "#ffffff",
          },
        },
        onUpdateColorScale: () => {},
      },
    }));

    await click(fixture, ".color-scale-container");
    expect(".o-popover").toHaveCount(1);

    triggerMouseEvent(fixture, "contextmenu");
    await nextTick();
    expect(".o-popover").toHaveCount(0);
  });
});
