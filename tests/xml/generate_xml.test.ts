import { XMLString } from "../../src/types/xlsx";
import { InnerContent } from "../../src/xlsx/xml";
import { generate } from "../../src/xlsx/xml/generate";

describe("js schema to xml", () => {
  test("generate a single element", () => {
    const schema = {
      name: "person",
    };
    const data = {
      person: {},
    };
    expect(generate(schema, data)).toEqual(new XMLString("<person/>"));
  });
  test("generate a single element with a value", () => {
    const schema = {
      name: "person",
    };
    const data = {
      person: "John",
    };
    expect(generate(schema, data)).toEqual(new XMLString("<person>John</person>"));
  });
  test("escape values", () => {
    const schema = {
      name: "person",
    };
    const data = {
      person: "<John/>",
    };
    expect(generate(schema, data)).toEqual(new XMLString("<person>&lt;John/&gt;</person>"));
  });
  test("generate an element with an attribute", () => {
    const schema = {
      name: "person",
      attributes: [{ name: "name" }],
    };
    const data = {
      person: {
        name: "John",
      },
    };
    expect(generate(schema, data)).toEqual(new XMLString('<person name="John"/>'));
  });
  test("generate an element with an attribute", () => {
    const schema = {
      name: "person",
      type: "string",
      attributes: [{ name: "age" }],
    } as const;
    const data = {
      person: {
        age: 12,
        [InnerContent]: "John",
      },
    };
    expect(generate(schema, data)).toEqual(new XMLString('<person age="12">John</person>'));
  });
  test("generate an element with two attributes", () => {
    const schema = {
      name: "person",
      attributes: [{ name: "firstName" }, { name: "lastName" }],
    };
    const data = {
      person: {
        firstName: "John",
        lastName: "Doe",
      },
    };
    expect(generate(schema, data)).toEqual(
      new XMLString('<person firstName="John" lastName="Doe"/>')
    );
  });
  test("generate a single element with an attribute and a value", () => {
    const schema = {
      name: "person",
      attributes: [{ name: "age" }],
    };
    const data = {
      person: {
        name: "John",
        age: 32,
      },
    };
    expect(generate(schema, data)).toEqual(new XMLString('<person age="32">John</person>'));
  });
  test("tag not found", () => {
    const schema = {
      name: "person",
    };
    const data = {
      city: "London",
    };
    expect(() => generate(schema, data)).toThrow("Expected person but found city");
  });
  test("attribute not found", () => {
    const schema = {
      name: "person",
      attributes: [{ name: "age" }],
    };
    const data = {
      person: {
        name: "John",
      },
    };
    expect(() => generate(schema, data)).toThrow("Expected person.age but found name");
  });
  test("namespace with prefix", () => {
    const schema = {
      name: "person",
      namespace: {
        prefix: "ns",
        uri: "http://example.com",
      },
    };
    const data = {
      person: "John",
    };
    expect(generate(schema, data)).toEqual(
      new XMLString('<ns:person xmlns:ns="http://example.com">John</ns:person>')
    );
  });
  test("attribute namespace with prefix", () => {
    const schema = {
      name: "person",
      attributes: [
        {
          name: "age",
          namespace: {
            prefix: "a",
            uri: "http://example.com",
          },
        },
      ],
    };
    const data = {
      person: {
        age: 32,
      },
    };
    expect(generate(schema, data)).toEqual(
      new XMLString('<person xmlns:a="http://example.com" a:age="32"/>')
    );
  });
  test("namespace with prefix on children", () => {
    const schema = {
      name: "person",
      children: [
        {
          name: "address",
          namespace: {
            prefix: "ns",
          },
        },
      ],
      namespace: {
        prefix: "ns",
        uri: "http://example.com",
      },
    };
    const data = {
      person: { address: "London" },
    };
    expect(generate(schema, data)).toEqual(
      new XMLString(
        '<ns:person xmlns:ns="http://example.com"><ns:address>London</ns:address></ns:person>'
      )
    );
  });
  test("namespace without prefix", () => {
    const schema = {
      name: "person",
      namespace: {
        uri: "http://example.com",
      },
    };
    const data = {
      person: "John",
    };
    expect(generate(schema, data)).toEqual(
      new XMLString('<person xmlns="http://example.com">John</person>')
    );
  });

  test("generate a single element with a single child element", () => {
    const schema = {
      name: "person",
      children: [
        {
          name: "address",
        },
      ],
    };
    const data = {
      person: {
        address: "London",
      },
    };
    expect(generate(schema, data)).toEqual(
      new XMLString("<person><address>London</address></person>")
    );
  });
  test("generate a single element with a single child wrong element", () => {
    const schema = {
      name: "person",
      children: [
        {
          name: "address",
        },
      ],
    };
    const data = {
      person: {
        city: "London",
      },
    };
    expect(() => generate(schema, data)).toThrow("Expected address but found city");
  });
  test("generate a sequence of simple elements", () => {
    const schema = {
      name: "person",
      children: [{ name: "friend", quantifier: "many" }],
    } as const;
    const data = {
      person: {
        friend: ["John", "Jane"],
      },
    };
    expect(generate(schema, data)).toEqual(
      new XMLString("<person><friend>John</friend><friend>Jane</friend></person>")
    );
  });
  test("generate a sequence of elements", () => {
    const schema = {
      name: "person",
      children: [{ name: "friend", quantifier: "many", attributes: [{ name: "name" }] }],
    } as const;
    const data = {
      person: {
        friend: [{ name: "John" }, { name: "Jane" }],
      },
    };
    expect(generate(schema, data)).toEqual(
      new XMLString('<person><friend name="John"/><friend name="Jane"/></person>')
    );
  });
});

// describe("XML to js", () => {
//   test("parse a single XML element", () => {
//     expect(parseElement("<person></person>")).toEqual({
//       name: "person",
//     });
//   });
//   test("parse a single XML element with an attribute", () => {
//     expect(parseElement('<person name="John"></person>')).toEqual({
//       name: "person",
//       attributes: [{ name: "name", value: "John" }],
//     });
//   });
// });
