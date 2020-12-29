import { HistoryManager } from "../src/history_manager";

describe("History Manager test", () => {
  let historyManager: HistoryManager<string>;
  let state: string[] = [];
  const apply = (data: string) => {
    state.push(data);
  };
  const revert = (data: string) => {
    const index = state.findIndex((s) => s === data);
    state = state.splice(index, 1);
  };

  beforeEach(() => {
    historyManager = new HistoryManager(apply, revert);
  });

  test("commit new change", () => {
    historyManager.commit("hello");
    historyManager.commit("plop");
    // @ts-ignore
    expect(historyManager.HEAD.data).toBe("plop");
    // @ts-ignore
    expect(historyManager.HEAD.previous?.data).toBe("hello");
    // @ts-ignore
    expect(historyManager.HEAD.previous?.next?.data).toBe("plop");
    // @ts-ignore
    expect(historyManager.HEAD.previous?.previous?.data).toBeUndefined();
  });

  test("Undo a change", () => {
    historyManager.commit("hello");
    const head = historyManager.HEAD;
    historyManager.commit("plop");
    state = ["hello", "plop"];
    historyManager.undo(head.id!);
    expect(state).toEqual(["plop"]);
  });
});
