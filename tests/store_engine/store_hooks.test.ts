import { Component, onWillStart, useState, xml } from "@odoo/owl";
import { DisposableStore, useLocalStore } from "../../src/store_engine";
import { mountComponent, nextTick } from "../test_helpers/helpers";

describe("useLocalStore", () => {
  test("local store is disposed when its component is destroyed before being mounted", async () => {
    const disposed = jest.fn();
    class MyLocalStore extends DisposableStore {
      constructor(get) {
        super(get);
        this.onDispose(disposed);
      }
    }

    class Child extends Component {
      static template = xml/* xml */ `<div class="child"/>`;
      static props = {};
      setup() {
        useLocalStore(MyLocalStore);
        // never resolves: the component is never mounted
        onWillStart(() => new Promise(() => {}));
      }
    }

    class Parent extends Component {
      static template = xml/* xml */ `<Child t-if="state.showChild"/>`;
      static components = { Child };
      static props = {};
      state = useState({ showChild: false });
    }

    const { parent } = await mountComponent(Parent);
    (parent as Parent).state.showChild = true;
    await nextTick();
    expect(".child").toHaveCount(0);
    expect(disposed).toHaveBeenCalledTimes(0);

    (parent as Parent).state.showChild = false;
    await nextTick();
    expect(disposed).toHaveBeenCalledTimes(1);
  });
});
