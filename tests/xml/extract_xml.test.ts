import { ElementSchema, extract } from "../../src/xlsx/xml";

describe("extract xml with js schema", () => {
  test("extract a single element", () => {
    const schema = {
      name: "person",
    };
    const xml = "<person/>";
    expect(extract(schema, xml)).toEqual({
      person: {},
    });
  });
  test("an element with a value", () => {
    const schema = {
      name: "person",
    };
    const xml = "<person>John</person>";
    expect(extract(schema, xml)).toEqual({
      person: {
        content: "John",
      },
    });
  });
  test("an number value", () => {
    const schema: ElementSchema = {
      name: "age",
      type: "number",
    };
    const xml = "<age>13</age>";
    expect(extract(schema, xml)).toEqual({
      age: {
        content: 13,
      },
    });
  });
  test("a wrong number value", () => {
    const schema: ElementSchema = {
      name: "age",
      type: "number",
    };
    const xml = "<age>this is not a number</age>";
    expect(() => extract(schema, xml)).toThrow("Expected number but found 'this is not a number'");
  });
  test("an element with an escaped value", () => {
    const schema = {
      name: "person",
    };
    const xml = "<person>&lt;John&gt;</person>";
    expect(extract(schema, xml)).toEqual({
      person: {
        content: "<John>",
      },
    });
  });
  test("element not found", () => {
    const schema = {
      name: "person",
    };
    const xml = "<city/>";
    expect(() => extract(schema, xml)).toThrow("Expected 'person' but found 'city'");
  });
  test("element with an attribute", () => {
    const schema = {
      name: "person",
      attributes: [{ name: "age" }],
    };
    const xml = '<person age="12"/>';
    expect(extract(schema, xml)).toEqual({
      person: { attributes: { age: "12" } },
    });
  });
  test("attribute not found", () => {
    const schema = {
      name: "person",
      attributes: [{ name: "age" }],
    };
    const xml = '<person name="John"/>';
    expect(() => extract(schema, xml)).toThrow("Expected 'person' to have attribute 'age'");
  });

  test("extract a child", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address" }],
    };
    const xml = "<person><address>London</address></person>";
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [{ name: "address", content: "London" }],
      },
    });
  });
  test("extract an optional child", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address", quantifier: "optional" }],
    };
    const xml = "<person><address/></person>";
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [{ name: "address" }],
      },
    });
  });
  test("missing optional child", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address", quantifier: "optional" }],
    };
    const xml = "<person/>";
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [],
      },
    });
  });
  test("extract a sequence of children in the correct order", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address" }, { name: "age" }],
    };
    const xml = /*xml*/ `<person><address/><age/></person>`;
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [{ name: "address" }, { name: "age" }],
      },
    });
  });
  test("cannot extract a sequence of children in the wrong order", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address" }, { name: "age" }],
    };
    const xml = /*xml*/ `<person><age/><address/></person>`;
    expect(() => extract(schema, xml)).toThrow("Missing child: 'age'");
  });
  test("extract sequence nested children ", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address", children: [{ name: "city" }] }],
    };
    const xml = /*xml*/ `
      <person>
        <address>
          <city>London</city>
        </address>
      </person>`;
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [{ name: "address", children: [{ name: "city", content: "London" }] }],
      },
    });
  });
  test("ignore unknown child elements", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address" }],
    };
    const xml = "<person><age/><address/><job/></person>";
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [{ name: "address" }],
      },
    });
  });
  test("cannot extract a missing child", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address" }],
    };
    const xml = "<person></person>";
    expect(() => extract(schema, xml)).toThrow("Missing child: 'address'");
  });
  test("cannot extract a missing required child", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address", quantifier: "required" }],
    };
    const xml = "<person></person>";
    expect(() => extract(schema, xml)).toThrow("Missing child: 'address'");
  });
  test("with an wrong child", () => {
    const schema: ElementSchema = {
      name: "person",
      children: [{ name: "address" }],
    };
    const xml = "<person><age>42</age></person>";
    expect(() => extract(schema, xml)).toThrow("Missing child: 'address'");
  });
  test("schema with many quantifier extracts many elements", () => {
    const schema: ElementSchema = {
      name: "country",
      children: [{ name: "city", quantifier: "many" }],
    };
    const xml = /*xml*/ `
      <country>
        <city>London</city>
        <city>Edinburgh</city>
      </country>`;
    expect(extract(schema, xml)).toEqual({
      country: {
        children: [
          { name: "city", content: "London" },
          { name: "city", content: "Edinburgh" },
        ],
      },
    });
  });
  test("schema with many quantifier does not extract from empty parent", () => {
    const schema: ElementSchema = {
      name: "country",
      children: [{ name: "city", quantifier: "many" }],
    };
    const xml = /*xml*/ `<country></country>`;
    expect(extract(schema, xml)).toEqual({
      country: { children: [] },
    });
  });
  test("extract a default namespaced child", () => {
    const namespace = "http://example.com";
    const schema: ElementSchema = {
      name: "person",
      namespace: { uri: namespace },
      children: [{ name: "address" }],
    };
    const xml = /*xml*/ `
      <person xmlns="http://example.com">
        <address/>
      </person>`;
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [{ name: "address" }],
      },
    });
  });
  test("extract a prefixed namespaced child", () => {
    const namespace = "http://example.com";
    const schema: ElementSchema = {
      name: "person",
      namespace: { uri: namespace, prefix: "a" },
      children: [{ name: "address" }],
    };
    const xml = /*xml*/ `
      <person xmlns:a="http://example.com">
        <a:address/>
      </person>`;
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [{ name: "address" }],
      },
    });
  });
  test("extract a different prefixed namespaced child", () => {
    const namespace = "http://example.com";
    const schema: ElementSchema = {
      name: "person",
      // namespace URI is the same but the prefix is different
      namespace: { uri: namespace, prefix: "a" },
      children: [{ name: "address" }],
    };
    const xml = /*xml*/ `
      <person xmlns:b="http://example.com">
        <b:address/>
      </person>`;
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [{ name: "address" }],
      },
    });
  });
  test("extract nested prefixed namespaced children", () => {
    const namespace = "http://example.com";
    const schema: ElementSchema = {
      name: "person",
      namespace: { uri: namespace, prefix: "a" },
      children: [
        {
          name: "address",
          children: [{ name: "city", namespace: { uri: "http://city.com" } }],
        },
      ],
    };
    const xml = /*xml*/ `
      <person xmlns:a="http://example.com">
        <a:address xmlns:c="http://city.com">
          <c:city>London</c:city>
        </a:address>
      </person>`;
    expect(extract(schema, xml)).toEqual({
      person: {
        children: [{ name: "address", children: [{ name: "city", content: "London" }] }],
      },
    });
  });
  test("does not extract a prefixed child from another namespace", () => {
    const namespaceB = "http://B.com";
    const schema: ElementSchema = {
      name: "country",
      namespace: { uri: namespaceB },
      children: [{ name: "city" }],
    };
    const xml = /*xml*/ `
      <country xmlns:a="http://A.com" xmlns:b="http://B.com">
        <a:city>London</a:city>
        <b:city>Edinburgh</b:city>
      </country>`;
    expect(extract(schema, xml)).toEqual({
      country: {
        children: [{ name: "city", content: "Edinburgh" }],
      },
    });
  });
});
