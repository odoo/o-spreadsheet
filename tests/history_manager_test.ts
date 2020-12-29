import { HistoryManager } from "../src/history_manager";

describe("History Manager test", () => {
  let git: HistoryManager<string>;
  let state: string[] = [];
  const apply = (data: string) => {
    state.push(data);
  };
  const revert = (data: string) => {
    const index = state.findIndex((s) => s === data);
    state = state.splice(index, 1);
  };

  beforeEach(() => {
    git = new HistoryManager(apply, revert);
  });

  test("commit new change", () => {
    git.commit("hello");
    git.commit("plop");
    // @ts-ignore
    expect(git.HEAD.data).toBe("plop");
    // @ts-ignore
    expect(git.HEAD.previous?.data).toBe("hello");
    // @ts-ignore
    expect(git.HEAD.previous?.next?.data).toBe("plop");
    // @ts-ignore
    expect(git.HEAD.previous?.previous?.data).toBeUndefined();
  });

  test("Undo a change", () => {
    git.commit("hello");
    const head = git.HEAD;
    git.commit("plop");
    state = ["hello", "plop"];
    git.undo(head.id!);
    expect(state).toEqual(["plop"]);
  });
});
