import { XMLString } from "../../types/xlsx";
import { parseXML } from "../helpers/xml_helpers";
import { ElementSchema, SequenceElementSchema, XMLType } from "./types";

const InnerContent = Symbol("content");

export type ExtractedSchema<S extends ElementSchema> = {
  [k in S["name"]]: ExtractedValues<S>;
};

type ExtractedValues<S extends ElementSchema> = HasInnerContentOnly<S> extends true
  ? TypescriptType<S["type"]>
  : Attrs<S> & Children<S> & InnerContentC<S>;

type HasInnerContentOnly<S extends ElementSchema> = Extract<
  keyof S,
  "attributes" | "children"
> extends never
  ? true
  : false;

type InnerContentC<S extends ElementSchema> = {
  [InnerContent]: TypescriptType<S["type"]>;
};
const atest = {
  name: "ddd",
  children: [
    { name: "a", type: "boolean" },
    { name: "b", type: "boolean" },
  ],
  attributes: [
    { name: "c", type: "boolean" },
    { name: "b", type: "number" },
  ],
} as const;
type BBB = typeof atest;
type DD = Attrs<BBB> & Children<BBB>;
type CCC = ExtractType<WithAttrs<BBB>["attributes"][number]>;

// type Attrs<S extends ElementSchema> = {
//   [name in ExtractedAttributes<S["attributes"]>]: TypedValue<Extract<ExtractedChildren<S["attributes"]>, { name: name }>["type"]>;
// }
type Attrs<S extends ElementSchema> = MapExtractType<NamedArrayToMap<WithAttrs<S>["attributes"]>>;

type WithAttrs<S extends ElementSchema> = Extract<S, { attributes: any }>;
type WithChildren<S extends ElementSchema> = Extract<S, { children: any }>;

type ChildrenMap<S extends ElementSchema> = {
  [name in keyof NamedArrayToMap<WithChildren<S>["children"]>]: NamedArrayToMap<
    WithChildren<S>["children"]
  >[name];
};
type Children<S extends ElementSchema> = {
  [name in keyof ChildrenMap<S>]: ExtractedValues<ChildrenMap<S>[name]>;
};

type MapExtractType<T extends Record<string, { type?: XMLType }>> = {
  [k in keyof T]: TypescriptType<T[k]["type"]>;
};

type ExtractType<T extends { type?: XMLType }> = Omit<[T], "type"> & {
  type: TypescriptType<T["type"]>;
};

type NamedArrayToMap<A extends readonly { name: string }[]> = {
  [name in A[number]["name"]]: Extract<A[number], { name: name }>;
};

type TypescriptType<T extends ElementSchema["type"]> = T extends "number"
  ? number
  : T extends "boolean"
  ? boolean
  : string;

// type ExtractedChildren<C extends ElementSchema["children"]> = C extends any[] ? C[number] : never;
// type ExtractedAttributes<A extends ElementSchema["attributes"]> = A extends any[]
//   ? A[number]["name"]
//   : never;

type MySchema = {
  name: "person";
  // attributes: [{ name: "age"; type: "number" }, { name: "married"; type: "boolean" }];
  children: [
    { name: "address"; type: "boolean" },
    {
      name: "friend";
      type: "number";
      attributes: [{ name: "qsdf" }];
      children: [{ name: "girlfriend"; type: "boolean" }];
    }
  ];
};
// type AA = ExtractedAttributes<MySchema["attributes"]>;
// type CC = ExtractedChildren<MySchema["children"]>;
type A = ExtractedSchema<MySchema>;

const a: A = {};
a.person.married;
a.person.age;
const ah = a.person.address;
const asqdfqsdh = a.person.friend.qsdf;
const bh = a.person.friend.girlfriend;

export function extract<S extends ElementSchema>(
  schema: S,
  xml: string | Element
): ExtractedSchema<S> {
  if (xml instanceof Element) {
    return extractFromDocument(qualifyNamespaces(schema), xml) as ExtractedSchema<S>;
  }
  const doc = parseXML(new XMLString(xml));
  const el = doc.firstElementChild;
  if (el === null) {
    throw new Error("No element found");
  }
  return extractFromDocument(qualifyNamespaces(schema), el) as ExtractedSchema<S>;
}

function extractFromDocument(schema: ElementSchema, el: Element): object {
  if (schema.name !== el.localName) {
    throw new Error(`Expected '${schema.name}' but found '${el.localName}'`);
  }
  const data: Record<string, ParsedElement> = {
    [schema.name]: {},
  };
  if (schema.children) {
    if (Array.isArray(schema.children)) {
      Object.assign(data[schema.name], extractChildren(schema.children, el));
    }
  } else if (el.textContent) {
    data[schema.name] = parseValue(el.textContent, schema.type);
  }
  if (schema.attributes) {
    Object.assign(data[schema.name], extractAttributes(schema, el));
  }
  return data;
}

function parseValue(textContent, type: ElementSchema["type"]) {
  switch (type) {
    case undefined:
    case "string":
      return textContent;
    case "number":
      const n = Number(textContent);
      if (Number.isNaN(n)) {
        throw new Error(`Expected number but found '${textContent}'`);
      }
      return n;
    case "boolean":
      return textContent === "1";
    case "date":
      return new Date(textContent);
    case "time":
      return new Date(textContent);
  }
}

function extractAttributes(schema: ElementSchema, el: Element) {
  const attributes = {};
  for (const attribute of schema.attributes || []) {
    const value = el.getAttributeNS(attribute.namespace?.uri || "", attribute.name);
    if (value === null) {
      throw new Error(`Expected '${schema.name}' to have attribute '${attribute.name}'`);
    }
    attributes[attribute.name] = value;
  }
  return attributes;
}

function extractChildren(childrenSchema: SequenceElementSchema[], el: Element): ParsedElement {
  childrenSchema = [...childrenSchema];
  let childSchema = childrenSchema.shift();
  if (childSchema?.quantifier === "many") {
    return { [childSchema.name]: extractRepeatingChildren(childSchema, el) };
  }
  const parsedChildren: Record<string, ParsedElement> = {};
  for (const child of el.children) {
    if (childSchema === undefined) {
      return parsedChildren;
    }
    switch (childSchema.quantifier) {
      case undefined:
      case "required":
      case "optional": {
        if (
          childSchema.name !== child.localName ||
          childSchema.namespace?.uri !== child.namespaceURI
        ) {
          // ignore unknown elements
          break;
        }
        parsedChildren[child.localName] = extractFromDocument(childSchema, child)[child.localName];
        childSchema = childrenSchema.shift();
        break;
      }
    }
  }
  if (
    childSchema !== undefined &&
    (childSchema.quantifier === "required" || childSchema.quantifier === undefined)
  ) {
    throw new Error(`Missing child: '${childSchema.name}'`);
  }
  if (childrenSchema.length) {
    throw new Error(`Missing child: '${childrenSchema[0].name}'`);
  }
  return parsedChildren;
}

function extractRepeatingChildren(childrenSchema: SequenceElementSchema, el: Element) {
  const children: ParsedElement[] = [];
  for (const child of el.children) {
    // TODO namespace just like above
    if (childrenSchema.name !== child.localName) {
      break;
    }
    children.push(extractFromDocument(childrenSchema, child)[child.localName]);
  }
  return children;
}
interface ParsedElement {
  [key: string]: any;
  // attributes?: Record<string, string>;
  // children?: ElementSequence | ChildElements;
  // content?: string | number | boolean | Date;
}

// type ElementSequence = ParsedElement[];
// type ChildElements = Record<string, ParsedElement>;

// interface NamedParsedElement extends ParsedElement {
//   name: string;
// }

/**
 * Add the namespace to all schema elements and all the children
 */
function qualifyNamespaces(schema: ElementSchema, namespace = schema.namespace): ElementSchema {
  const qualifiedSchema = { ...schema };
  qualifiedSchema.namespace = qualifiedSchema.namespace || namespace || { uri: null };
  if (schema.children) {
    qualifiedSchema.children = schema.children.map((child) =>
      qualifyNamespaces(child, qualifiedSchema.namespace)
    );
  }
  return qualifiedSchema;
}
