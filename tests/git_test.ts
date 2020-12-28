import { Git } from "../src/git";

describe("Git test", () => {
  let git: Git<string>;
  let state: string[] = [];
  const apply = (data: string) => {
    state.push(data);
  };
  const revert = (data: string) => {
    const index = state.findIndex((s) => s === data);
    state = state.splice(index, 1);
  };

  beforeEach(() => {
    git = new Git(apply, revert);
  });

  test("commit new change", () => {
    git.commit("hello");
    git.commit("plop");
    expect(git.HEAD.data).toBe("plop");
    expect(git.HEAD.previous?.data).toBe("hello");
    expect(git.HEAD.previous?.next?.data).toBe("plop");
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
