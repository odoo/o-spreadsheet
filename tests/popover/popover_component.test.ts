import { App, Component, useSubEnv, xml } from "@odoo/owl";
import { Model } from "../../src";
import { Popover, PopoverProps } from "../../src/components/popover/popover";
import { Pixel, Rect } from "../../src/types";
import { getStylePropertyInPx, mountComponent } from "../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../test_helpers/mock_helpers";

const POPOVER_HEIGHT = 200;
const POPOVER_WIDTH = 200;

let fixture: HTMLElement;
let model: Model;
let app: App;

interface MountPopoverArgs extends Partial<PopoverProps> {
  childWidth: Pixel;
  childHeight: Pixel;
  containerRect?: Rect;
}

async function mountTestPopover(args: MountPopoverArgs) {
  class Parent extends Component<any, any> {
    static template = xml/* xml */ `
        <div class="o-spreadsheet">
          <Popover t-props="popoverProps">
            <div style="height:${args.childHeight}px;width:${args.childWidth}px;"/>
          </Popover>
        </div>
  `;
    static components = { Popover };
    static props = { model: Object };

    setup() {
      const env: any = {
        model: this.props.model,
        isDashboard: () => false,
      };
      if (args.containerRect) {
        env.getPopoverContainerRect = () => args.containerRect;
      }
      useSubEnv(env);
    }

    get popoverProps() {
      return {
        anchorRect: args.anchorRect || { x: 0, y: 0, width: 10, height: 10 },
        positioning: args.positioning || "right",
        maxWidth: args.maxHeight,
        maxHeight: args.maxHeight,
      };
    }
  }

  ({ fixture, app } = await mountComponent(Parent, { props: { model } }));
}

mockGetBoundingClientRect({
  "o-popover": (el: HTMLElement) => {
    const maxHeight = getStylePropertyInPx(el, "max-height");
    const maxWidth = getStylePropertyInPx(el, "max-height");
    const childHeight = getStylePropertyInPx(el.firstChild! as HTMLElement, "height");
    const childWidth = getStylePropertyInPx(el.firstChild! as HTMLElement, "width");
    return {
      height: childHeight || maxHeight,
      width: childWidth || maxWidth,
    };
  },
  "o-spreadsheet": () => ({ top: 0, left: 0, height: 1000, width: 1000 }),
});

beforeEach(async () => {
  model = Model.BuildSync();
});

describe("Popover sizing", () => {
  test("Prop maxHeight and maxWidth make popover use CSS maxwidth/height", async () => {
    await mountTestPopover({
      anchorRect: { x: 0, y: 0, width: 0, height: 0 },
      positioning: "TopRight",
      maxWidth: POPOVER_WIDTH,
      maxHeight: POPOVER_HEIGHT,
      childHeight: 100,
      childWidth: 100,
    });
    const popover = fixture.querySelector(".o-popover")! as HTMLElement;
    expect(popover).toBeTruthy();
    expect(popover.style["max-width"]).toEqual(`${POPOVER_WIDTH}px`);
    expect(popover.style["max-height"]).toEqual(`${POPOVER_HEIGHT}px`);
  });

  test("Popover use the spreadsheet size to compute its max size", async () => {
    await mountTestPopover({
      anchorRect: { x: 0, y: 0, width: 0, height: 0 },
      positioning: "TopRight",
      childHeight: 100,
      childWidth: 100,
    });
    const popover = fixture.querySelector(".o-popover")! as HTMLElement;
    expect(popover).toBeTruthy();
    expect(popover.style["max-width"]).toEqual("1000px");
    expect(popover.style["max-height"]).toEqual("1000px");
  });
});

describe("Popover positioning", () => {
  describe("Popover positioned TopRight", () => {
    test("Popover right of point", async () => {
      await mountTestPopover({
        anchorRect: { x: 0, y: 0, width: 0, height: 0 },
        positioning: "TopRight",
        childHeight: 100,
        childWidth: 100,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual("0px");
      expect(popover.style.top).toEqual("0px");
    });

    test("Popover right of box", async () => {
      const box = { x: 0, y: 0, width: 100, height: 100 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "TopRight",
        childWidth: 50,
        childHeight: 50,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual(`${box.width}px`);
      expect(popover.style.top).toEqual(`${box.y}px`);
    });

    test("Popover overflowing right is rendered left of box", async () => {
      const viewPortDims = model.getters.getSheetViewDimensionWithHeaders();
      const box = { x: viewPortDims.width - 50, y: 0, width: 50, height: 50 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "TopRight",
        childWidth: 100,
        childHeight: 100,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual(`${box.x - 100}px`);
      expect(popover.style.top).toEqual(`${box.y}px`);
    });

    test("Popover overflowing down is rendered with its bottom aligned to the bottom of the box", async () => {
      const viewPortDims = model.getters.getSheetViewDimensionWithHeaders();
      const box = { x: 0, y: viewPortDims.height - 50, width: 50, height: 50 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "TopRight",
        childHeight: 100,
        childWidth: 100,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual(`${box.width}px`);
      expect(popover.style.top).toEqual(`${box.y + box.height - 100}px`);
    });

    test("Popover overflowing down and right is rendered to the left of the box with its bottom aligned to the bottom of the box", async () => {
      const viewPortDims = model.getters.getSheetViewDimensionWithHeaders();
      const box = {
        x: viewPortDims.width - 50,
        y: viewPortDims.height - 50,
        width: 50,
        height: 50,
      };
      await mountTestPopover({
        anchorRect: box,
        positioning: "TopRight",
        childHeight: 100,
        childWidth: 100,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual(`${box.x - 100}px`);
      expect(popover.style.top).toEqual(`${box.y + box.height - 100}px`);
    });
  });

  describe("Popover positioned BottomLeft", () => {
    test("Popover bottom of point", async () => {
      await mountTestPopover({
        anchorRect: { x: 0, y: 0, width: 0, height: 0 },
        positioning: "BottomLeft",
        childHeight: 100,
        childWidth: 100,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual("0px");
      expect(popover.style.top).toEqual("0px");
    });

    test("Popover bottom of box", async () => {
      const box = { x: 0, y: 0, width: 100, height: 100 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "BottomLeft",
        childHeight: 100,
        childWidth: 100,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual(`${box.x}px`);
      expect(popover.style.top).toEqual(`${box.height}px`);
    });

    test("Popover overflowing right is rendered with its right border matching the box right border", async () => {
      const viewPortDims = model.getters.getSheetViewDimensionWithHeaders();
      const box = { x: viewPortDims.width - 50, y: 0, width: 50, height: 50 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "BottomLeft",
        childWidth: 100,
        childHeight: 100,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual(`${box.x + box.width - 100}px`);
      expect(popover.style.top).toEqual(`${box.height}px`);
    });

    test("Popover overflowing down is rendered above the box", async () => {
      const viewPortDims = model.getters.getSheetViewDimensionWithHeaders();
      const box = { x: 0, y: viewPortDims.height - 50, width: 50, height: 50 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "BottomLeft",
        childHeight: 100,
        childWidth: 100,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual(`${box.x}px`);
      expect(popover.style.top).toEqual(`${box.y - 100}px`);
    });

    test("Popover overflowing down and right is rendered with its right border matching the box right border and above the box", async () => {
      const viewPortDims = model.getters.getSheetViewDimensionWithHeaders();
      const box = {
        x: viewPortDims.width - 50,
        y: viewPortDims.height - 50,
        width: 50,
        height: 50,
      };
      await mountTestPopover({
        anchorRect: box,
        containerRect: { x: 0, y: 0, ...viewPortDims },
        positioning: "BottomLeft",
        childHeight: 100,
        childWidth: 100,
      });
      const popover = fixture.querySelector(".o-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style.left).toEqual(`${box.x + box.width - 100}px`);
      expect(popover.style.top).toEqual(`${box.y - 100}px`);
    });
  });

  test("If the anchorRect is not fully in the containerRect, the intersection between the two in taken as anchor", async () => {
    const viewPortDims = model.getters.getSheetViewDimensionWithHeaders();
    const anchorRect = {
      x: viewPortDims.width - 75,
      y: 0,
      width: 100,
      height: 100,
    };
    await mountTestPopover({
      anchorRect,
      positioning: "BottomLeft",
      childHeight: 100,
      childWidth: 100,
    });
    const popover = fixture.querySelector(".o-popover")! as HTMLElement;
    expect(popover).toBeTruthy();
    expect(popover.style.left).toEqual(`${anchorRect.x + 75 - 100}px`);
    expect(popover.style.top).toEqual(`${anchorRect.y + anchorRect.height}px`);
  });

  test("If the anchorRect is not at all in the containerRect, the popover is hidden", async () => {
    const viewPortDims = model.getters.getSheetViewDimensionWithHeaders();
    const anchorRect = {
      x: viewPortDims.width + 75,
      y: 0,
      width: 100,
      height: 100,
    };
    await mountTestPopover({
      anchorRect,
      positioning: "BottomLeft",
      childHeight: 100,
      childWidth: 100,
    });
    const popover = fixture.querySelector(".o-popover")! as HTMLElement;
    expect(popover).toBeTruthy();
    expect(popover.style.display).toEqual("none");
  });

  test("The containerRect is the spreadsheet element if it is not explicitly in the popover props", async () => {
    mockGetBoundingClientRect({
      "o-spreadsheet": () => ({ x: 200, y: 200, width: 1000, height: 1000 }),
    });
    await mountTestPopover({
      anchorRect: { x: 0, y: 0, width: 0, height: 0 },
      positioning: "BottomLeft",
      childHeight: 100,
      childWidth: 100,
    });
    let popover = fixture.querySelector(".o-popover")! as HTMLElement;
    expect(popover.style.display).toEqual("none");

    app.destroy();
    await mountTestPopover({
      anchorRect: { x: 300, y: 300, width: 0, height: 0 },
      positioning: "BottomLeft",
      childHeight: 100,
      childWidth: 100,
    });
    popover = fixture.querySelector(".o-popover")! as HTMLElement;
    expect(popover.style.display).toEqual("block");

    app.destroy();
    await mountTestPopover({
      anchorRect: { x: 1400, y: 1400, width: 0, height: 0 },
      positioning: "BottomLeft",
      childHeight: 100,
      childWidth: 100,
    });
    popover = fixture.querySelector(".o-popover")! as HTMLElement;
    expect(popover.style.display).toEqual("none");
  });
});
