import { tokenize } from "../src/expression_compiler";

describe("tokenizer", () => {
  test("simple token", () => {
    expect(tokenize("1")).toEqual([{
        start: 0,
        end: 1,
        length: 1,
        type: "NUMBER",
        value: 1
    }]);
  });

});

