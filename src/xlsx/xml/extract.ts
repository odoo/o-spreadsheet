import { XMLString } from "../../types/xlsx";
import { parseXML } from "../helpers/xml_helpers";
import { ElementSchema as XMLSchema, SequenceElementSchema, XMLType } from "./types";

export const InnerContent = Symbol("InnerContent");

export type ExtractedSchema<S extends XMLSchema> = {
  [k in S["name"]]: ExtractedValues<S>;
};

/**
 * A primitive type if the element has no children or attributes.
 * Otherwise, it is an object with the attributes and children as properties.
 */
type ExtractedValues<S extends XMLSchema> = HasInnerContentOnly<S> extends true
  ? TypescriptType<S["type"]>
  : AttrsValues<S> & ChildrenValues<S> & InnerContentC<S>;

type HasInnerContentOnly<S extends XMLSchema> = And<
  HasKey<S, "type">,
  Not<HasKey<S, "attributes" | "children">>
>;

type HasKey<T, K extends string> = Extract<keyof T, K> extends never ? false : true;

type Not<T extends boolean> = T extends true ? false : true;
type And<T extends boolean, U extends boolean> = T extends true ? U : false;

type InnerContentC<S extends XMLSchema> = HasKey<S, "type"> extends true
  ? {
      [InnerContent]: TypescriptType<S["type"]>;
    }
  : Record<string, unknown>;

type AttrsValues<S extends XMLSchema> = MapExtractType<NamedArrayToMap<WithAttrs<S>["attributes"]>>;

type WithAttrs<S extends XMLSchema> = Extract<S, { attributes: any }>;

type ChildrenValues<S extends XMLSchema> = {
  [name in keyof Children<S>]: ChildValue<Children<S>[name]>;
};

type ChildValue<C extends SequenceElementSchema> = C["quantifier"] extends "many"
  ? ExtractedValues<C>[]
  : C["quantifier"] extends "optional"
  ? ExtractedValues<C> | undefined
  : ExtractedValues<C>;

type Children<S extends XMLSchema> = NamedArrayToMap<WithChildren<S>["children"]>;
type WithChildren<S extends XMLSchema> = Extract<S, { children: any }>;

type MapExtractType<T extends Record<string, { type?: XMLType }>> = {
  [k in keyof T]: TypescriptType<T[k]["type"]>;
};

type NamedArrayToMap<A extends readonly { name: string }[]> = {
  [name in A[number]["name"]]: Extract<A[number], { name: name }>;
};

type TypescriptType<T extends XMLSchema["type"]> = T extends "number"
  ? number
  : T extends "boolean"
  ? boolean
  : string;

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

// type MySchema = {
//   name: "person";
//   attributes: [{ name: "age"; type: "number" }, { name: "married"; type: "boolean" }];
//   children: [
//     { name: "address"; type: "boolean", quantifier: "optional" },
//     {
//       name: "friend";
//       quantifier: "optional";
//       type: "number";
//       attributes: [{ name: "qsdf" }];
//       children: [{ name: "girlfriend"; type: "boolean" }];
//     }
//   ];
// };
// type A = ExtractedSchema<MySchema>;

// const a: A = {};
// a.person.married;
// a.person.age;
// const ah = a.person.address;
// const asqdfqsdh = a.person.friend?.qsdf;
// const bh = a.person.friend.girlfriend;

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
