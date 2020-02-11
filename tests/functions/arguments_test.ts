import { args } from "../../src/functions/arguments";

describe("args", () => {
  test("various", () => {
    expect(args``).toEqual([]);
    expect(args`test (number) some number`).toEqual([
      {
        type: ["NUMBER"],
        description: "some number",
        name: "test"
      }
    ]);

    expect(args`
       test (number) some number
       test2 (number) some other number
      `).toEqual([
      {
        type: ["NUMBER"],
        description: "some number",
        name: "test"
      },
      {
        type: ["NUMBER"],
        description: "some other number",
        name: "test2"
      }
    ]);
  });

  test("empty description", () => {
    expect(args`test (number)`).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: ""
      }
    ]);
  });

  test("does not care if lower or uppercase", () => {
    expect(args`test (NUMBER)`).toEqual([
      {
        type: ["NUMBER"],
        name: "test",
        description: ""
      }
    ]);
  });

  test("accept all basic types", () => {
    expect(args`test (boolean)`[0].type).toEqual(["BOOLEAN"]);
    expect(args`test (any)`[0].type).toEqual(["ANY"]);
    expect(args`test (NumBer)`[0].type).toEqual(["NUMBER"]);
    expect(args`test (string)`[0].type).toEqual(["STRING"]);
  });

  test("accept all range types", () => {
    expect(args`test (range)`[0].type).toEqual(["RANGE"]);
    expect(args`test (range<any>)`[0].type).toEqual(["RANGE"]);
    expect(args`test (range<boolean>)`[0].type).toEqual(["RANGE<BOOLEAN>"]);
    expect(args`test (range<number>)`[0].type).toEqual(["RANGE<NUMBER>"]);
    expect(args`test (range<string>)`[0].type).toEqual(["RANGE<STRING>"]);
  });

  test("accept multiple types", () => {
    expect(args`test (boolean,string)`[0].type).toEqual(["BOOLEAN", "STRING"]);
    expect(args`test (string,any)`[0].type).toEqual(["STRING", "ANY"]);
  });

  test("accept optional flag", () => {
    expect(args`test (boolean,optional)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN"],
        optional: true
      }
    ]);
    expect(args`test (boolean,optional,string)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN", "STRING"],
        optional: true
      }
    ]);
  });
  test("accept repeating flag", () => {
    expect(args`test (boolean,repeating)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN"],
        repeating: true
      }
    ]);
    expect(args`test (boolean,repeating,number)`).toEqual([
      {
        description: "",
        name: "test",
        type: ["BOOLEAN", "NUMBER"],
        repeating: true
      }
    ]);
  });
});
