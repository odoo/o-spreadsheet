import { XMLString } from "../../types/xlsx";
import { ElementSchema } from "./types";

export function generate(schema: ElementSchema, data: object): XMLString {
  const s = new XMLSerializer();
  return new XMLString(s.serializeToString(generateElement(schema, data)));
}

function createBaseElement(schema: ElementSchema) {
  const xmlDocument = document.implementation.createDocument(schema.namespace?.uri || "", "", null);
  const tag = schema.namespace?.prefix ? `${schema.namespace.prefix}:${schema.name}` : schema.name;
  if (schema.namespace?.uri) {
    return xmlDocument.createElementNS(schema.namespace.uri, tag);
  }
  return xmlDocument.createElement(tag);
}

function generateElement(schema: ElementSchema, data: object): Element {
  if (schema.name in data === false) {
    throw new Error(`Expected ${schema.name} but found ${Object.keys(data)}`);
  }

  const element = createBaseElement(schema);
  if (typeof data[schema.name] !== "object") {
    element.textContent = data[schema.name];
    return element;
  }
  const properties = new Set(Object.keys(data[schema.name]));
  for (const attribute of schema.attributes || []) {
    if (!properties.has(attribute.name)) {
      throw new Error(
        `Expected ${schema.name}.${attribute.name} but found ${Object.keys(data[schema.name])}`
      );
    }
    properties.delete(attribute.name);
    const qualifiedName = attribute.namespace?.prefix
      ? `${attribute.namespace.prefix}:${attribute.name}`
      : attribute.name;
    element.setAttributeNS(
      attribute.namespace?.uri || "",
      qualifiedName,
      data[schema.name][attribute.name]
    );
    // element.setAttribute(attribute.name, data[schema.name][attribute.name]);
  }
  if (properties.size === 1 && properties) {
    if (schema.children?.length === 1) {
      element.appendChild(generateElement(schema.children[0], data[schema.name]));
    } else {
      element.textContent = data[schema.name][properties.values().next().value];
    }
  }
  return element;
}
