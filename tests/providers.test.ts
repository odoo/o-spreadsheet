import { reactive } from "@odoo/owl";
import { store } from "../src/stores/providers";

test("blou", () => {
  const originState = reactive({
    a: 1,
    get b() {
      return this.a;
    },
  });
  const callback = jest.fn();
  const state = reactive(originState, callback);
  expect(state.b).toBe(1); // read state
  originState.a = 2;
  expect(callback).toHaveBeenCalledTimes(1);
  expect(state.b).toBe(2); // read state
  originState.a = 3;
  expect(callback).toHaveBeenCalledTimes(2);
});

test("with class", () => {
  class Test {
    a = 5;
    get b() {
      return this.a + 5;
    }

    increment() {
      this.a = this.a + 1;
    }
  }
  const state = new Test();
  const rea = reactive(state, () => console.log("coucou"));
  rea.a;
  rea.increment();
  expect(rea.a).toBe(6);
  expect(state.a).toBe(6);
});

test("with getter", () => {
  const base = { b: 5 };
  const state = reactive(
    {
      get a() {
        return base;
      },
    },
    () => console.log("coucou")
  );
  expect(state.a.b).toBe(5);
  base.b = 6;
});

test("store qsdf ", () => {
  const state = { content: 5 };
  const myStore = store({
    state,
    actions: class {},
    computeView: (state) => state.content,
  });
  expect(myStore.state).toEqual(5);
  state.content = 6;
  expect(myStore.state).toEqual(6);
});
