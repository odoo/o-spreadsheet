import { fuzzyLookup, fuzzyMatch } from "../../src/helpers";

function fuzzyTest(pattern: string, string: string) {
  return fuzzyMatch(pattern, string) !== 0;
}

describe("Fuzzy search", () => {
  test("fuzzyLookup", () => {
    const data = [
      { name: "Abby White" },
      { name: "Robert Black" },
      { name: "Jane Yellow" },
      { name: "Brandon Green" },
      { name: "Jeremy Red" },
    ];
    expect(fuzzyLookup("ba", data, (d) => d.name)).toEqual([
      { name: "Brandon Green" },
      { name: "Robert Black" },
    ]);
    expect(fuzzyLookup("g", data, (d) => d.name)).toEqual([{ name: "Brandon Green" }]);
    expect(fuzzyLookup("z", data, (d) => d.name)).toEqual([]);
    expect(fuzzyLookup("brand", data, (d) => d.name)).toEqual([{ name: "Brandon Green" }]);
    expect(fuzzyLookup("ja", data, (d) => d.name)).toEqual([{ name: "Jane Yellow" }]);
    expect(fuzzyLookup("je", data, (d) => d.name)).toEqual([
      { name: "Jeremy Red" },
      { name: "Jane Yellow" },
    ]);
    expect(fuzzyLookup("", data, (d) => d.name)).toEqual([]);
  });

  test("fuzzyTest", () => {
    expect(fuzzyTest("a", "Abby White")).toBeTruthy();
    expect(fuzzyTest("ba", "Brandon Green")).toBeTruthy();
    expect(fuzzyTest("je", "Jeremy red")).toBeTruthy();
    expect(fuzzyTest("z", "Abby White")).toBeFalsy();
    expect(fuzzyTest("ba", "Abby White")).toBeFalsy();
  });
});
