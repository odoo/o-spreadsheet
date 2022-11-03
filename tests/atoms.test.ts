import { atom, createContext } from "../src/atoms/atoms";

describe("atoms", () => {
  // test("computed state", () => {
  //     const state = atom({ n: 5})
  //     const double = state.map((state) => state.n*2)
  //     expect(double.value).toBe(10)
  //     state.value.n = 2
  //     expect(double.value).toBe(4)
  // })

  test("sqsdfqdsf", () => {
    const ctx = createContext();
    const itemsAtom = atom<number[]>(() => []);
    const numberOfItemsAtom = atom((ctx) => {
      const length = ctx.get(itemsAtom).value.length;
      return { length };
    });
    expect(ctx.get(itemsAtom).value).toEqual([]);
    expect(ctx.get(numberOfItemsAtom).value).toEqual({ length: 0 });
    ctx.get(itemsAtom).value.push(4);
    expect(ctx.get(itemsAtom).value).toEqual([4]);
    expect(ctx.get(numberOfItemsAtom).value).toEqual({ length: 1 });
    ctx.get(itemsAtom).value = [1, 2];
    expect(ctx.get(numberOfItemsAtom).value).toEqual({ length: 2 });
  });

  test("chain of 3", () => {
    const ctx = createContext();
    const itemsAtom = atom<number[]>(() => []);
    const numberOfItemsAtom = atom((ctx) => {
      const length = ctx.get(itemsAtom).value.length;
      return { length };
    });
    const double = atom((ctx) => {
      const { length } = ctx.get(numberOfItemsAtom).value;
      return { double: length * 2 };
    });
    expect(ctx.get(double).value).toEqual({ double: 0 });
    ctx.get(itemsAtom).value.push(4);
    expect(ctx.get(double).value).toEqual({ double: 2 });
  });
});
