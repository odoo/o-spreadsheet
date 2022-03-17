import { Model, Spreadsheet } from "../../src";
import { Popover } from "../../src/components/popover";
import { BoxDims } from "../../src/types";
import { makeTestFixture, mountSpreadsheet, nextTick } from "../test_helpers/helpers";

const POPOVER_HEIGHT = 200;
const POPOVER_WIDTH = 200;

let fixture: HTMLElement;
let model: Model;
let parent: Spreadsheet;

async function mountTestPopover(args: {
  anchorRect: BoxDims;
  positioning?: "bottom" | "right";
  dynamicHeight?: boolean;
  dynamicWidth?: boolean;
}) {
  const popover = new Popover(parent, {
    anchorRect: args.anchorRect,
    positioning: args.positioning || "right",
    childMaxWidth: POPOVER_WIDTH,
    childMaxHeight: POPOVER_HEIGHT,
    marginTop: 0,
    dynamicHeight: !!args.dynamicHeight,
    dynamicWidth: !!args.dynamicWidth,
    verticalOffset: 0,
  });
  await popover.mount(fixture);
  await nextTick();
}

beforeEach(async () => {
  fixture = makeTestFixture();
  const data = {
    sheets: [
      {
        colNumber: 10,
        rowNumber: 10,
      },
    ],
  };
  parent = await mountSpreadsheet(fixture, { data });
  model = parent.model;
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
});

describe("Popover sizing", () => {
  test("Base sizing", async () => {
    await mountTestPopover({
      anchorRect: { x: 0, y: 0, width: 0, height: 0 },
      positioning: "right",
    });
    const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
    expect(popover).toBeTruthy();
    expect(popover.style["width"]).toEqual(`${POPOVER_WIDTH}px`);
    expect(popover.style["height"]).toEqual(`${POPOVER_HEIGHT}px`);
  });

  test("Prop dynamicHeight makes popover use max-height instead of height", async () => {
    await mountTestPopover({
      anchorRect: { x: 0, y: 0, width: 0, height: 0 },
      positioning: "right",
      dynamicHeight: true,
    });
    const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
    expect(popover).toBeTruthy();
    expect(popover.style["height"]).toBeFalsy();
    expect(popover.style["max-height"]).toEqual(`${POPOVER_HEIGHT}px`);
  });

  test("Prop dynamicWidth makes popover use max-width instead of width", async () => {
    await mountTestPopover({
      anchorRect: { x: 0, y: 0, width: 0, height: 0 },
      positioning: "right",
      dynamicWidth: true,
    });
    const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
    expect(popover).toBeTruthy();
    expect(popover.style["width"]).toBeFalsy();
    expect(popover.style["max-width"]).toEqual(`${POPOVER_WIDTH}px`);
  });
});

describe("Popover positioning", () => {
  describe("Popover positioned right", () => {
    test("Popover right of point", async () => {
      await mountTestPopover({
        anchorRect: { x: 0, y: 0, width: 0, height: 0 },
        positioning: "right",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["left"]).toEqual("0px");
      expect(popover.style["top"]).toEqual("0px");
    });

    test("Popover right of box", async () => {
      await mountTestPopover({
        anchorRect: { x: 0, y: 0, width: 100, height: 100 },
        positioning: "right",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["left"]).toEqual("100px");
      expect(popover.style["top"]).toEqual("0px");
    });

    test("Popover overflowing right is rendered left of box", async () => {
      const viewPortDims = model.getters.getViewportDimension();
      const box = { x: viewPortDims.width, y: 0, width: 100, height: 100 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "right",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["right"]).toEqual(`${window.innerWidth - box.x}px`);
      expect(popover.style["top"]).toEqual("0px");
    });

    test("Popover overflowing down is rendered with its bottom aligned to the bottom of the box", async () => {
      const viewPortDims = model.getters.getViewportDimension();
      const box = { x: 0, y: viewPortDims.height, width: 100, height: 100 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "right",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["left"]).toEqual("100px");
      expect(popover.style["bottom"]).toEqual(`${window.innerHeight - box.y - box.height}px`);
    });

    test("Popover overflowing down and right is rendered to the left of the box with its bottom aligned to the bottom of the box", async () => {
      const viewPortDims = model.getters.getViewportDimension();
      const box = { x: viewPortDims.width, y: viewPortDims.height, width: 100, height: 100 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "right",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["right"]).toEqual(`${window.innerWidth - box.x}px`);
      expect(popover.style["bottom"]).toEqual(`${window.innerHeight - box.y - box.height}px`);
    });
  });

  describe("Popover positioned bottom", () => {
    test("Popover bottom of point", async () => {
      await mountTestPopover({
        anchorRect: { x: 0, y: 0, width: 0, height: 0 },
        positioning: "bottom",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["left"]).toEqual("0px");
      expect(popover.style["top"]).toEqual("0px");
    });

    test("Popover bottom of box", async () => {
      await mountTestPopover({
        anchorRect: { x: 0, y: 0, width: 100, height: 100 },
        positioning: "bottom",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["left"]).toEqual("0px");
      expect(popover.style["top"]).toEqual("100px");
    });

    test("Popover overflowing right is rendered with its right border matching the box right border", async () => {
      const viewPortDims = model.getters.getViewportDimension();
      const box = { x: viewPortDims.width, y: 0, width: 100, height: 100 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "bottom",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["right"]).toEqual(`${window.innerWidth - box.x - box.width}px`);
      expect(popover.style["top"]).toEqual("100px");
    });

    test("Popover overflowing down is rendered above the box", async () => {
      const viewPortDims = model.getters.getViewportDimension();
      const box = { x: 0, y: viewPortDims.height, width: 100, height: 100 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "bottom",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["left"]).toEqual("0px");
      expect(popover.style["bottom"]).toEqual(`${window.innerHeight - box.y}px`);
    });

    test("Popover overflowing down and right is rendered with its right border matching the box right border and above the box", async () => {
      const viewPortDims = model.getters.getViewportDimension();
      const box = { x: viewPortDims.width, y: viewPortDims.height, width: 100, height: 100 };
      await mountTestPopover({
        anchorRect: box,
        positioning: "bottom",
      });
      const popover = fixture.querySelector(".o-spreadsheet-popover")! as HTMLElement;
      expect(popover).toBeTruthy();
      expect(popover.style["right"]).toEqual(`${window.innerWidth - box.x - box.width}px`);
      expect(popover.style["bottom"]).toEqual(`${window.innerHeight - box.y}px`);
    });
  });
});
