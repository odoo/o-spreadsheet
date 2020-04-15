import { Component, tags } from "@odoo/owl";
import { Spreadsheet } from "../../src/components";
import { makeTestFixture, nextTick } from "../helpers";

const { xml } = tags;

let fixture: HTMLElement;

class Parent extends Component<any> {
  static template = xml`<Spreadsheet/>`;
  static components = { Spreadsheet };
}

beforeEach(async () => {
  fixture = makeTestFixture();
  const parent = new Parent();
  await parent.mount(fixture);
});

afterEach(() => {
  fixture.remove();
});

describe("Spreadsheet", () => {
  test("simple rendering snapshot", async () => {
    expect(fixture.querySelector(".o-spreadsheet")).toMatchSnapshot();
  });

  test("focus is properly set, initially and after switching sheet", async () => {
    expect(document.activeElement!.tagName).toEqual("CANVAS");
    document.querySelector(".o-add-sheet")!.dispatchEvent(new Event("click"));
    // simulate the fact that a user clicking on the add sheet button will
    // move the focus to the document.body
    (document.activeElement as any).blur();
    await nextTick();
    expect(document.querySelectorAll(".o-sheet").length).toBe(2);
    expect(document.activeElement!.tagName).toEqual("CANVAS");
  });
});
