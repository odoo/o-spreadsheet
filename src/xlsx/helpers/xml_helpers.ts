import { concat } from "../../helpers/misc";
import { XMLAttributeValue, XMLString } from "../../types/xlsx";

/**
 * XML primitives shared between import, export, the clipboard plugin and
 * tests. Export-only helpers (`createXMLFile`, `formatAttributes`,
 * `joinXmlNodes`, `createOverride`, `createDefaultXMLElement`) live in
 * `src/xlsx/export/xlsx_xml.ts` next to the serializers.
 */

export function xmlEscape(str: XMLAttributeValue): string {
  return (
    String(str)
      .replace(/\&/g, "&amp;")
      .replace(/\</g, "&lt;")
      .replace(/\>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/\'/g, "&apos;")
      // Strip ASCII control characters except TAB / LF / CR — they are
      // invalid in XML 1.0 even when escaped.
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
  );
}

export function parseXML(
  xmlString: XMLString,
  mimeType: DOMParserSupportedType = "text/xml"
): XMLDocument {
  const document = new DOMParser().parseFromString(xmlString.toString(), mimeType);
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    const errorString = parserError.innerHTML;
    const lineNumber = parseInt(errorString.split(":")[0], 10);
    const xmlStringArray = xmlString.toString().trim().split("\n");
    const xmlPreview = xmlStringArray
      .slice(Math.max(lineNumber - 3, 0), Math.min(lineNumber + 2, xmlStringArray.length))
      .join("\n");
    throw new Error(`XML string could not be parsed: ${errorString}\n${xmlPreview}`);
  }
  return document;
}

/**
 * Tagged-template helper that escapes interpolated values, except those that
 * are already a properly-escaped `XMLString`.
 *
 * ```
 * escapeXml`<t>${"This will be escaped"}</t>`
 * ```
 */
export function escapeXml(strings: TemplateStringsArray, ...expressions): XMLString {
  const str = [strings[0]];
  for (let i = 0; i < expressions.length; i++) {
    const value = expressions[i] instanceof XMLString ? expressions[i] : xmlEscape(expressions[i]);
    str.push(value + strings[i + 1]);
  }
  return new XMLString(concat(str));
}

/**
 * Removes the escaped namespace of all the xml tags in the string.
 *
 * Eg. : "NAMESPACEnsNAMESPACEtest a" => "test a"
 */
export function removeTagEscapedNamespaces(tag: string): string {
  return tag.replace(/NAMESPACE.*NAMESPACE(.*)/, "$1");
}

/**
 * Encase the namespaces in the element's tags with the literal "NAMESPACE"
 * marker.
 *
 * e.g. <x:foo> becomes <NAMESPACExNAMESPACEFoo>
 *
 * Useful because namespaces aren't supported by the HTML specification, so
 * a HTML parser/`querySelector` may or may not handle them.
 */
export function escapeTagNamespaces(str: string): string {
  return str.replaceAll(
    /(<\/?)([a-zA-Z0-9]+):([a-zA-Z0-9]+)/g,
    "$1" + "NAMESPACE" + "$2" + "NAMESPACE" + "$3"
  );
}

export function escapeQueryNameSpaces(query: string): string {
  return query.replaceAll(
    /([a-zA-Z0-9]+):([a-zA-Z0-9]+)/g,
    "NAMESPACE" + "$1" + "NAMESPACE" + "$2"
  );
}
