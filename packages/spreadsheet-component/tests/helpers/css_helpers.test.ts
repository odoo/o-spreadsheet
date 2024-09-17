/**
 * Imported from owl 1 and adapted to spreadsheet needs.
 */

import { Component, mount, xml } from "@odoo/owl";
import { css, processSheet } from "../../src/components/helpers/css";
import { makeTestFixture } from "../test_helpers/helpers";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
  document.head.innerHTML = "";
});

afterEach(() => {
  fixture.remove();
});

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("styles and component", () => {
  test("can define an inline stylesheet", async () => {
    const name = css/* scss */ `
      .app {
        color: red;
      }
    `;

    class App extends Component {
      static template = xml`<div class="app">text</div>`;
      static props = {};
    }

    expect(document.head.innerHTML).toBe(`<style component=\"${name}\">.app {
  color: red;
}</style>`);

    await mount(App, fixture);
    const style = getComputedStyle(fixture.querySelector(".app")!);
    expect(style.color).toBe("red");
    expect(fixture.innerHTML).toBe('<div class="app">text</div>');
  });

  test("inherited components properly apply css", async () => {
    const appName = css/* scss */ `
      .app {
        color: red;
      }
    `;
    const subAppName = css/* scss */ `
      .app {
        font-weight: bold;
      }
    `;
    class App extends Component {
      static template = xml`<div class="app">text</div>`;
      static props = {};
    }
    class SubApp extends App {}

    expect(document.head.innerHTML).toBe(`<style component=\"${appName}\">.app {
  color: red;
}</style><style component=\"${subAppName}\">.app {
  font-weight: bold;
}</style>`);

    await mount(SubApp, fixture);
    const style = getComputedStyle(fixture.querySelector(".app")!);
    expect(style.color).toBe("red");
    expect(style.fontWeight).toBe("bold");
    expect(fixture.innerHTML).toBe('<div class="app">text</div>');
  });

  test("inline stylesheets are processed", async () => {
    css/* scss */ `
      .app {
        color: red;
        .some-class {
          font-weight: bold;
          width: 40px;
        }

        display: block;
      }
    `;

    expect(document.head.querySelector("style")!.innerHTML).toBe(`.app {
  color: red;
}
.app .some-class {
  font-weight: bold;
  width: 40px;
}
.app {
  display: block;
}`);
  });

  test("properly handle rules with commas", async () => {
    const sheet = processSheet(`.parent-a, .parent-b {
      .child-a, .child-b {
        color: red;
      }
    }`);

    expect(sheet)
      .toBe(`.parent-a .child-a, .parent-a .child-b, .parent-b .child-a, .parent-b .child-b {
  color: red;
}`);
  });

  test("handle & selector", async () => {
    let sheet = processSheet(`.btn {
      &.danger {
        color: red;
      }
    }`);

    expect(sheet).toBe(`.btn.danger {
  color: red;
}`);

    sheet = processSheet(`.some-class {
      &.btn {
        .other-class ~ & {
          color: red;
        }
      }
    }`);

    expect(sheet).toBe(`.other-class ~ .some-class.btn {
  color: red;
}`);
  });
});
