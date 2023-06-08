import { XMLString } from "../../types/xlsx";
import { parseXML } from "../helpers/xml_helpers";
import { FIGURE_SCHEMA } from "../schema/figures_schema";
import { ElementSchema as XMLSchema, SequenceElementSchema, XMLType } from "./types";

export const InnerContent = Symbol("InnerContent");

export type ExtractedSchema<S extends XMLSchema> = {
  [k in S["name"]]: ExtractedData<S>;
};

/**
 * A primitive type if the element has no children or attributes.
 * Otherwise, it is an object with the attributes and children as properties.
 */
type ExtractedData<S extends XMLSchema> = HasInnerContentOnly<S> extends true
  ? TypescriptType<S["type"]>
  : AttrsData<S> & ChildrenData<S> & InnerContentC<S>;

type HasInnerContentOnly<S extends XMLSchema> = And<
  HasKey<S, "type">,
  Not<HasKey<S, "attributes" | "children">>
>;

type InnerContentC<S extends XMLSchema> = HasKey<S, "type"> extends true
  ? {
      [InnerContent]: TypescriptType<S["type"]>;
    }
  : Record<string, unknown>;

type AttrsData<S extends XMLSchema> = MapType<MapName<Attrs<S>>>;

type ChildrenData<S extends XMLSchema> = RequiredChildrenData<S>
&
  OptionalChildrenData<S> &
  SequenceChildrenData<S>;

type SequenceChildrenData<S extends XMLSchema> = {
  [k in keyof SequenceChildrenMap<S>]: ExtractedData<SequenceChildrenMap<S>[k]>[];
};
type RequiredChildrenData<S extends XMLSchema> = {
  [k in keyof RequiredChildrenMap<S>]: ExtractedData<RequiredChildrenMap<S>[k]>;
};
type OptionalChildrenData<S extends XMLSchema> = {
  [k in keyof OptionalChildrenMap<S>]?: ExtractedData<OptionalChildrenMap<S>[k]>;
};
// type OptionalChildrenData<S extends XMLSchema> = Partial<ExtractedData<OptionalChildrenMap<S>>>

type OptionalChildrenMap<S extends XMLSchema> = MapName<OptionalChildren<Children<S>>>;
type SequenceChildrenMap<S extends XMLSchema> = MapName<SequenceChildren<Children<S>>>;
type RequiredChildrenMap<S extends XMLSchema> = MapName<RequiredChildren<Children<S>>>;


type FF = SequenceChildrenMap<typeof FIGURE_SCHEMA.children[0]>
// type ChildrenMap<S extends XMLSchema> = Partial<MapName<OptionalChildren<Children<S>>>> &
//   MapName<SequenceChildren<Children<S>>> &
//   MapName<RequiredChildren<Children<S>>>;

// type ChildValue<C extends SequenceElementSchema> = C["quantifier"] extends "many"
//   ? ExtractedValues<C>[]
//   : C["quantifier"] extends "optional"
//   ? ExtractedValues<C> | undefined
//   : ExtractedValues<C>;

// type SequenceChildren<S extends SequenceElementSchema> = {

// }

// type OptionalChildren<C extends Record<string, SequenceElementSchema>> = OmitNever<{
//   [k in keyof C]: C[k] extends { quantifier: "optional" } ? C[k] : never;
// }>;
// type SequenceChildren<C extends Record<string, SequenceElementSchema>> = OmitNever<{
//   [k in keyof C]: C[k] extends { quantifier: "many" } ? C[k][] : never;
// }>;
type OptionalChildren<C extends SequenceElementSchema> = Extract<C, { quantifier: "optional" }>;
type SequenceChildren<C extends SequenceElementSchema> = Extract<C, { quantifier: "many" }>;
type RequiredChildren<C extends SequenceElementSchema> = Exclude<
  C,
  OptionalChildren<C> | SequenceChildren<C>
>;

/**
 * TODO
 */
type Children<S extends XMLSchema> = ArrayItemsKeyValues<S, "children">[number];
type Attrs<S extends XMLSchema> = ArrayItemsKeyValues<S, "attributes">[number];

// type WithAttrs<S extends XMLSchema> = Extract<S, { attributes: any }>;
// type WithChildren<S extends XMLSchema> = Extract<S, { children: any }>;

type ArrayItemsKeyValues<T, K extends string> = Extract<T, { [k in K]: any }>[K];

type MapType<T extends Record<string, { type?: XMLType }>> = {
  [k in keyof T]: TypescriptType<T[k]["type"]>;
};

type MapName<A extends { name: string }> = {
  [I in A as I["name"]]: I;
};

type TypescriptType<T extends XMLSchema["type"]> = T extends "number"
  ? number
  : T extends "boolean"
  ? boolean
  : string;

type HasKey<T, K extends string> = Extract<keyof T, K> extends never ? false : true;

type Not<T extends boolean> = T extends true ? false : true;
type And<T extends boolean, U extends boolean> = T extends true ? U : false;

// const atest = {
//   name: "ddd",
//   children: [
//     { name: "a", type: "boolean" },
//     { name: "b", type: "boolean", attributes: [{ name: "c" }, { name: "d" }] },
//   ],
//   attributes: [
//     { name: "c", type: "boolean" },
//     { name: "d", type: "number" },
//   ],
// } as const;
// type BBB = typeof atest;
// type DD = AttrsValues<BBB> & ChildrenValues<BBB>;
// type UUU = ChildrenValuestest<BBB>;

// type ExtractedChildren<C extends ElementSchema["children"]> = C extends any[] ? C[number] : never;
// type ExtractedAttributes<A extends ElementSchema["attributes"]> = A extends any[]
//   ? A[number]["name"]
//   : never;

type MySchema = {
  name: "person";
  attributes: [{ name: "age"; type: "number" }, { name: "married"; type: "boolean" }];
  children: [
    { name: "address"; type: "boolean"; quantifier: "optional" },
    {
      name: "friend";
      // quantifier: "many";
      // type: "number";
      attributes: [{ name: "qsdf", type : "boolean" }];
      children: [{ name: "girlfriend"; type: "boolean" }];
    },
    {
      name: "hobby";
      // quantifier: "many";
      // type: "number";
      attributes: [{ name: "team", type : "boolean" }];
      children: [{ name: "dangerous"; type: "boolean" }];
    }
  ];
};
type A = ExtractedSchema<MySchema>;

type C = RequiredChildrenMap<MySchema>;
const c = {} as C;
// c.friend.map((f) => f.girlfriend);
const ad = c.;

const a: A = {};
a.person.friend.girlfriend
a.person.age;
// const ah = a.person.hobby.;
const asqdfqsdh = a.person.friend?.map((f) => f.);
const bh = a.person.friend?.map((f) => f.team);

export function extract<S extends XMLSchema>(schema: S, xml: string | Element): ExtractedSchema<S> {
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

function extractFromDocument(schema: XMLSchema, el: Element): ExtractedSchema<XMLSchema> {
  if (schema.name !== el.localName) {
    throw new Error(`Expected '${schema.name}' but found '${el.localName}'`);
  }
  if (el.textContent && !schema.children && !schema.attributes) {
    return {
      [schema.name]: castValueToType(el.textContent, schema.type),
    };
  }
  const data: any = {};
  if (schema.children) {
    if (Array.isArray(schema.children)) {
      Object.assign(data, extractChildren(schema.children, el));
    }
  }
  if (schema.attributes) {
    Object.assign(data, extractAttributes(schema, el));
  }
  if (el.textContent) {
    const textNode = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE);
    const text = textNode?.textContent?.trim();
    if (text) {
      data[InnerContent] = castValueToType(text, schema.type);
    }
  }
  return {
    [schema.name]: data,
  };
}

function castValueToType(textContent, type: XMLSchema["type"]) {
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

function extractAttributes(schema: XMLSchema, el: Element) {
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
function qualifyNamespaces(schema: XMLSchema, namespace = schema.namespace): XMLSchema {
  const qualifiedSchema = { ...schema };
  qualifiedSchema.namespace = qualifiedSchema.namespace || namespace || { uri: null };
  if (schema.children) {
    qualifiedSchema.children = schema.children.map((child) =>
      qualifyNamespaces(child, qualifiedSchema.namespace)
    );
  }
  return qualifiedSchema;
}
