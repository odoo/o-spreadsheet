import { BorderEditor, BorderEditorProps } from "../../src/components/border_editor/border_editor";
import { DEFAULT_BORDER_DESC } from "../../src/constants";
import { Model } from "../../src/model";
import { simulateClick } from "../test_helpers/dom_helper";
import { makeTestFixture, mountComponentWithPortalTarget } from "../test_helpers/helpers";

let fixture: HTMLElement;

async function setDefaultBorder(name: string) {
  await simulateClick(`.o-line-item[name="${name}"]`);
  if (name !== "clear") {
    await simulateClick('div[title="Border color"]');
    await simulateClick(`div[data-color="${DEFAULT_BORDER_DESC.color}"]`);
    await simulateClick('div[title="Line style"]');
    await simulateClick(`div[title="${DEFAULT_BORDER_DESC.style}"]`);
  }
}

async function mountBorderEditor(
  partialProps: Partial<BorderEditorProps> = {},
  model = Model.BuildSync()
) {
  const props = {
    onBorderColorPicked: partialProps.onBorderColorPicked || (() => {}),
    currentBorderColor: partialProps.currentBorderColor || DEFAULT_BORDER_DESC.color,
    onBorderStylePicked: partialProps.onBorderStylePicked || (() => {}),
    currentBorderStyle: partialProps.currentBorderStyle || DEFAULT_BORDER_DESC.style,
    onBorderPositionPicked: partialProps.onBorderPositionPicked || (() => {}),
    currentBorderPosition: partialProps.currentBorderPosition || "all",
    maxHeight: partialProps.maxHeight !== undefined ? partialProps.maxHeight : 1000,
    anchorRect: partialProps.anchorRect || { x: 0, y: 0, width: 0, height: 0 },
  };
  ({ fixture } = await mountComponentWithPortalTarget(BorderEditor, { model, props }));
}

let onBorderColorPicked: jest.Mock;
let onBorderStylePicked: jest.Mock;
let onBorderPositionPicked: jest.Mock;

beforeEach(() => {
  fixture = makeTestFixture();
  onBorderColorPicked = jest.fn();
  onBorderStylePicked = jest.fn();
  onBorderPositionPicked = jest.fn();
});

afterEach(() => {
  fixture.remove();
});

describe("Can set borders", () => {
  let model: Model;
  beforeEach(async () => {
    model = Model.BuildSync();
    await mountBorderEditor(
      { onBorderColorPicked, onBorderPositionPicked, onBorderStylePicked },
      model
    );
  });

  test.each(["all", "left", "right", "top", "bottom", "hv", "h", "v", "external", "clear"])(
    "Can set border(s)",
    async (position: string) => {
      await setDefaultBorder(position);
      expect(onBorderPositionPicked).toHaveBeenCalledWith(position);
      if (position !== "clear") {
        expect(onBorderColorPicked).toHaveBeenCalledWith(DEFAULT_BORDER_DESC.color);
        expect(onBorderStylePicked).toHaveBeenCalledWith(DEFAULT_BORDER_DESC.style);
      }
    }
  );

  test.each(["thin", "medium", "thick", "dotted", "dashed"])(
    "Can change borders type",
    async (style: string) => {
      await setDefaultBorder("left");
      await simulateClick('div[title="Line style"]');
      await simulateClick(`div[title="${style}"]`);
      expect(onBorderStylePicked).toHaveBeenCalledWith(style);
    }
  );

  test.each(["left", "right", "top", "bottom"])(
    "Can set a border color",
    async (position: string) => {
      await setDefaultBorder(position);
      await simulateClick('div[title="Border color"]');
      await simulateClick('div[data-color="#FF9900"]');
      expect(onBorderColorPicked).toHaveBeenCalledWith("#FF9900");
    }
  );
});
