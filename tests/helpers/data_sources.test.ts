import { DataSources } from "../../src";

describe("DataSources", () => {
  test("basic functionality", () => {
    class Dummy {}
    class Dummy2 {}
    const dataSources = new DataSources({});
    expect(dataSources.getAll()).toEqual([]);
    expect(dataSources.contains("foo")).toBe(false);

    dataSources.add("foo", Dummy, {});
    expect(dataSources.contains("foo")).toBe(true);
    expect(dataSources.get("foo")).toBeInstanceOf(Dummy);
    expect(dataSources.getAll()).toHaveLength(1);

    dataSources.add("foo", Dummy2, {});
    expect(dataSources.get("foo")).toBeInstanceOf(Dummy2);
    expect(dataSources.getAll()).toHaveLength(1);
  });

  test("DataSource arguments", () => {
    class Dummy {
      constructor(public readonly custom, public readonly param) {}
    }
    const dataSources = new DataSources({ custom: "hello" });
    dataSources.add("foo", Dummy, { test: "hello" });
    const ds = dataSources.get("foo") as Dummy;
    expect(ds.param).toEqual({ test: "hello" });
    expect(ds.custom).toEqual({ custom: "hello" });
  });
});
