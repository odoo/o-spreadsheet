import { XMLString } from "../../types/xlsx";
import { parseXML } from "../helpers/xml_helpers";
import { ElementSchema, SequenceElementSchema } from "./types";

export function extract(schema: ElementSchema, xml: string | Element): object {
  if (xml instanceof Element) {
    return extractFromDocument(qualifyNamespaces(schema), xml);
  }
  const doc = parseXML(new XMLString(xml));
  const el = doc.firstElementChild;
  if (el === null) {
    throw new Error("No element found");
  }
  return extractFromDocument(qualifyNamespaces(schema), el);
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
      data[schema.name].children = extractChildren(schema.children, el);
    }
  } else if (el.textContent) {
    data[schema.name].content = parseValue(el.textContent, schema.type);
  }
  if (schema.attributes) {
    data[schema.name].attributes = extractAttributes(schema, el);
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

function extractChildren(
  childrenSchema: SequenceElementSchema[],
  el: Element
): NamedParsedElement[] {
  childrenSchema = [...childrenSchema];
  let childSchema = childrenSchema.shift();
  const parsedChildren: NamedParsedElement[] = [];
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
        const childData = {
          name: child.localName,
          ...extractFromDocument(childSchema, child)[child.localName],
        };
        parsedChildren.push(childData);
        childSchema = childrenSchema.shift();
        break;
      }
      case "many": {
        // TODO namespace just like above
        if (childSchema.name !== child.localName) {
          childSchema = childrenSchema.shift();
          break;
        }
        const childData = {
          name: child.localName,
          ...extractFromDocument(childSchema, child)[child.localName],
        };
        parsedChildren.push(childData);
        break;
      }
      case "optional": {
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
interface ParsedElement {
  attributes?: Record<string, string>;
  children?: ElementSequence | ChildElements;
  content?: string | number | boolean | Date;
}

type ElementSequence = ParsedElement[];
type ChildElements = Record<string, ParsedElement>;

interface NamedParsedElement extends ParsedElement {
  name: string;
}

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
