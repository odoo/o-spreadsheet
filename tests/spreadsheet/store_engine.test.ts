import { batched, onMounted, useProps, xml } from "@odoo/owl";
import { types } from "../../src/components/props_validation";
import { render } from "../../src/helpers/owl3_helpers";
import { Component } from "../../src/owl3_compatibility_layer";
import {
  useChildStoreProvider,
  useStore,
  useStoreProvider,
} from "../../src/store_engine/store_hooks";
import { SpreadsheetStore } from "../../src/stores/spreadsheet_store";
import { Store } from "../../src/types/store_engine";
import { mountComponent, nextTick } from "../test_helpers/helpers";

class TestStore extends SpreadsheetStore {
  mutators = ["setValue"] as const;
  value = "initial";

  setValue(value: string) {
    this.value = value;
  }
}

describe("Children stores", () => {
  class Child extends Component<any> {
    static template = xml/* xml */ `<div class="childText" t-out="this.store.value" />`;
    props = useProps({ childOwnStores: types.array() });
    store!: Store<TestStore>;

    setup() {
      useChildStoreProvider(this.props.childOwnStores);
      this.store = useStore(TestStore);
      onMounted(() => {
        this.store.setValue("child");
      });
    }
  }

  class Parent extends Component<any> {
    static template = xml/* xml */ `
        <div class="parentText" t-out="this.store.value" />
        <Child t-props="this.props"/>
    `;
    static components = { Child };
    props = useProps({ childOwnStores: types.array() });
    store!: Store<TestStore>;

    setup() {
      const batchedRender = batched(() => render(this, true));
      const stores = useStoreProvider();
      this.store = useStore(TestStore);
      onMounted(() => {
        stores.on("store-updated", this, batchedRender);
        this.store.setValue("parent");
      });
    }
  }

  test("Can use a child store with a child store provider", async () => {
    await mountComponent(Parent, { props: { childOwnStores: [TestStore] } });
    await nextTick(); // Another render because the stores are updated on mounted
    expect(".parentText").toHaveText("parent");
    expect(".childText").toHaveText("child");
  });

  test("Only the store given as useChildStoreProvider argument are specific to the child component", async () => {
    await mountComponent(Parent, { props: { childOwnStores: [] } });
    await nextTick(); // Another render because the stores are updated on mounted
    expect(".parentText").toHaveText("parent");
    expect(".childText").toHaveText("parent");
  });
});
