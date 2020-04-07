import { Component, tags } from "@odoo/owl";
import { Spreadsheet } from "../../src/ui";
import { makeTestFixture } from "../helpers";

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
});
