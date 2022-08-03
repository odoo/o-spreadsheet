import { isDefined } from "../../helpers";
import {
  XLSXColor,
  XLSXColorScheme,
  XLSXFileStructure,
  XLSXImportFile,
  XLSXRel,
  XLSXTheme,
  XMLFile,
} from "../../types/xlsx";
import { fixXlsxUnicode } from "../helpers/misc";
import { XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import {
  areNamespaceIgnoredByQuerySelector,
  escapeNamespaces,
  removeNamespaces,
} from "../helpers/xml_helpers";

interface MapOnElementArgs {
  query: string;
  parent: Element | XMLDocument;
  children?: boolean;
}

interface ExtractArg {
  required?: boolean;
  default?: string | boolean | number;
}

class AttributeValue {
  private readonly value: string | boolean | number;
  constructor(value: string | boolean | number) {
    this.value = value;
  }

  asString(): string {
    return fixXlsxUnicode(String(this.value));
  }

  asBool(): boolean {
    return Boolean(Number(this.value));
  }

  asNum(): number {
    return Number(this.value);
  }
}

type ExtractAttrType<T> = T extends { required: true } | { default: string | number | boolean }
  ? AttributeValue
  : AttributeValue | undefined;

type ExtractTextType<T> = T extends { required: true } | { default: string | number | boolean }
  ? string
  : string | undefined;

export class XlsxBaseExtractor {
  protected rootFile: XLSXImportFile;
  protected xlsxFileStructure: XLSXFileStructure;
  protected warningManager: XLSXImportWarningManager;
  protected relationships: Record<string, XLSXRel>;

  // The xml file we are currently parsing. We should have one Extractor class by XLSXImportFile, but
  // the XLSXImportFile contains both the main .xml file, and the .rels file
  protected currentFile: string | undefined = undefined;

  // If the parser querySelector() implementation ignores tag namespaces or not
  protected areNamespaceIgnored: boolean;

  constructor(
    rootFile: XLSXImportFile,
    xlsxStructure: XLSXFileStructure,
    warningManager: XLSXImportWarningManager
  ) {
    this.rootFile = rootFile;
    this.currentFile = rootFile.file.fileName;
    this.xlsxFileStructure = xlsxStructure;
    this.warningManager = warningManager;
    this.areNamespaceIgnored = areNamespaceIgnoredByQuerySelector();
    this.relationships = {};
    if (rootFile.rels) {
      this.extractRelationships(rootFile.rels).map((rel) => {
        this.relationships[rel.id] = rel;
      });
    }
  }

  /**
   * Extract all the relationships inside a .xml.rels file
   */
  protected extractRelationships(relFile: XMLFile): XLSXRel[] {
    return this.mapOnElements(
      { parent: relFile.xml, query: "Relationship" },
      (relationshipElement): XLSXRel => {
        return {
          id: this.extractAttr(relationshipElement, "Id", { required: true }).asString(),
          target: this.extractAttr(relationshipElement, "Target", { required: true }).asString(),
          type: this.extractAttr(relationshipElement, "Type", { required: true }).asString(),
        };
      }
    );
  }

  /**
   * Get the list of all the XLSX files in the XLSX file structure
   */
  protected getListOfFiles(): XLSXImportFile[] {
    const files = Object.values(this.xlsxFileStructure).flat().filter(isDefined);
    return files;
  }

  /**
   * Return an array containing the return value of the given function applied to all the XML elements
   * found using the MapOnElementArgs.
   *
   * The arguments contains :
   *  - query : a QuerySelector string to find the elements to apply the function to
   *  - parent : an XML element or XML document in which to find the queried elements
   *  - children : if true, the function is applied on the direct children of the queried element
   *
   * This method will also handle the errors thrown in the argument function.
   */
  protected mapOnElements<T>(args: MapOnElementArgs, fct: (e: Element) => T): T[] {
    const ret: T[] = [];
    const oldWorkingDocument = this.currentFile;
    let elements: HTMLCollection | NodeListOf<Element> | Element[];
    if (args.children) {
      const children = this.querySelector(args.parent, args.query)?.children;
      elements = children ? children : [];
    } else {
      elements = this.querySelectorAll(args.parent, args.query);
    }

    if (elements) {
      for (let element of elements) {
        try {
          ret.push(fct(element));
        } catch (e) {
          this.catchErrorOnElement(e, element);
        }
      }
    }

    this.currentFile = oldWorkingDocument;
    return ret;
  }

  /**
   * Log an error caught when parsing an element in the warningManager.
   */
  protected catchErrorOnElement(error: Error, onElement?: Element) {
    const errorMsg = onElement
      ? `Error when parsing an element <${onElement.tagName}> of file ${this.currentFile}, skip this element. \n${error.stack}`
      : `Error when parsing file ${this.currentFile}.`;

    this.warningManager.addParsingWarning([errorMsg, error.message].join("\n"));
  }

  /**
   * Extract an attribute from an Element.
   *
   * If the attribute is required but was not found, will add a warning in the warningManager if it was given a default
   * value, and throw an error if no default value was given.
   *
   * Can only return undefined value for non-required attributes without default value.
   */
  protected extractAttr<T extends ExtractArg>(
    e: Element,
    attName: string,
    optionalArgs?: T
  ): ExtractAttrType<T> {
    const attribute = e.attributes[attName];

    if (!attribute) this.handleMissingValue(e, `attribute "${attName}"`, optionalArgs);

    const value = attribute?.value ? attribute.value : optionalArgs?.default;
    return (value === undefined ? undefined : new AttributeValue(value)) as ExtractAttrType<T>;
  }

  /**
   * Extract the text content of an Element.
   *
   * If the text content is required but was not found, will add a warning in the warningManager if it was given a default
   * value, and throw an error if no default value was given.
   *
   * Can only return undefined value for non-required text content without default value.
   */
  protected extractTextContent<T extends ExtractArg>(
    element: Element,
    optionalArgs?: T
  ): ExtractTextType<T> {
    if (optionalArgs?.default !== undefined && typeof optionalArgs.default !== "string") {
      throw new Error("extractTextContent default value should be a string");
    }
    const shouldPreserveSpaces = element?.attributes["xml:space"]?.value === "preserve";
    let textContent = element?.textContent;

    if (!element || textContent === null) {
      this.handleMissingValue(element, `text content`, optionalArgs);
    }

    if (textContent) {
      textContent = shouldPreserveSpaces ? textContent : textContent.trim();
    }
    return (
      textContent ? fixXlsxUnicode(textContent) : optionalArgs?.default
    ) as ExtractTextType<T>;
  }

  /**
   * Extract an attribute of a child of the given element.
   *
   * The reference of a child can be a string (tag of the child) or an number (index in the list of children of the element)
   *
   * If the attribute is required but either the attribute or the referenced child element was not found, it will
   * will add a warning in the warningManager if it was given a default value, and throw an error if no default value was given.
   *
   * Can only return undefined value for non-required attributes without default value.
   */
  protected extractChildAttr<T extends ExtractArg>(
    e: Element,
    childRef: string | number,
    attName: string,
    optionalArgs?: T
  ): ExtractAttrType<T> {
    let child: Element | null;
    if (typeof childRef === "number") {
      child = e.children[childRef];
    } else {
      child = this.querySelector(e, childRef);
    }

    if (!child) {
      this.handleMissingValue(
        e,
        typeof childRef === "number" ? `child at index ${childRef}` : `child <${childRef}>`,
        optionalArgs
      );
    }

    const value = child
      ? this.extractAttr(child, attName, optionalArgs)?.asString()
      : optionalArgs?.default;

    return (value !== undefined ? new AttributeValue(value) : undefined) as ExtractAttrType<T>;
  }

  /**
   * Extract the text content of a child of the given element.
   *
   * If the text content is required but either the text content or the referenced child element was not found, it will
   * will add a warning in the warningManager if it was given a default value, and throw an error if no default value was given.
   *
   * Can only return undefined value for non-required text content without default value.
   */
  protected extractChildTextContent<T extends ExtractArg>(
    e: Element,
    childRef: string,
    optionalArgs?: T
  ): ExtractTextType<T> {
    if (optionalArgs?.default !== undefined && typeof optionalArgs.default !== "string") {
      throw new Error("extractTextContent default value should be a string");
    }

    let child = this.querySelector(e, childRef);

    if (!child) {
      this.handleMissingValue(e, `child <${childRef}>`, optionalArgs);
    }

    return (
      child ? this.extractTextContent(child, optionalArgs) : optionalArgs?.default
    ) as ExtractTextType<T>;
  }

  /**
   * Should be called if a extractAttr/extractTextContent doesn't find the element it needs to extract.
   *
   * If the extractable was required, this function will add a warning in the warningManager if there was a default value,
   * and throw an error if no default value was given.
   */
  private handleMissingValue(
    parentElement: Element,
    missingElementName: string,
    optionalArgs?: ExtractArg
  ) {
    if (optionalArgs?.required) {
      if (optionalArgs?.default) {
        this.warningManager.addParsingWarning(
          `Missing required ${missingElementName} in element <${parentElement.tagName}> of ${this.currentFile}, replacing it by the default value ${optionalArgs.default}`
        );
      } else {
        throw new Error(
          `Missing required ${missingElementName} in element <${parentElement.tagName}> of ${this.currentFile}, and no default value was set`
        );
      }
    }
  }

  /**
   * Extract a color, extracting it from the theme if needed.
   *
   * Will throw an error if the element references a theme, but no theme was provided or the theme it doesn't contain the color.
   */
  protected extractColor<T extends string | undefined>(
    colorElement: Element | null,
    theme: XLSXTheme | undefined,
    defaultColor?: T
  ): T extends string ? XLSXColor : XLSXColor | undefined {
    if (!colorElement) {
      return defaultColor ? { rgb: defaultColor } : (undefined as any);
    }
    const themeIndex = this.extractAttr(colorElement, "theme")?.asString();
    let rgb: string | undefined;
    if (themeIndex !== undefined) {
      if (!theme || !theme.clrScheme) {
        throw new Error("Color referencing a theme but no theme was provided");
      }
      rgb = this.getThemeColor(themeIndex, theme.clrScheme);
    } else {
      rgb = this.extractAttr(colorElement, "rgb")?.asString();
    }
    const color = {
      rgb,
      auto: this.extractAttr(colorElement, "auto")?.asBool(),
      indexed: this.extractAttr(colorElement, "indexed")?.asNum(),
      tint: this.extractAttr(colorElement, "tint")?.asNum(),
    };
    return color;
  }

  /**
   * Returns the xlsx file targeted by a relationship.
   */
  protected getTargetXmlFile(relationship: XLSXRel): XLSXImportFile {
    if (!relationship) throw new Error("Undefined target file");
    let target = relationship.target;
    target = target.replace("../", "");
    target = target.replace("./", "");
    // Use "endsWith" because targets are relative paths, and we know the files by their absolute path.
    const f = this.getListOfFiles().find((f) => f.file.fileName.endsWith(target));
    if (!f || !f.file) throw new Error("Cannot find target file");
    return f;
  }

  /**
   * Wrapper of querySelector, but we'll remove the namespaces from the query if areNamespacesIgnored is true.
   *
   * Why we need to do this :
   *  - For an XML "<t:test />"
   *  - on Jest(jsdom) : xml.querySelector("test") == null, xml.querySelector("t\\:test") == <t:test />
   *  - on Browser : xml.querySelector("test") == <t:test />, xml.querySelector("t\\:test") == null
   */
  protected querySelector(element: Element | Document, query: string) {
    query = this.areNamespaceIgnored ? removeNamespaces(query) : escapeNamespaces(query);
    return element.querySelector(query);
  }

  /**
   * Wrapper of querySelectorAll, but we'll remove the namespaces from the query if areNamespacesIgnored is true.
   *
   * Why we need to do this :
   *  - For an XML "<t:test />"
   *  - on Jest(jsdom) : xml.querySelectorAll("test") == [], xml.querySelectorAll("t\\:test") == [<t:test />]
   *  - on Browser : xml.querySelectorAll("test") == [<t:test />], xml.querySelectorAll("t\\:test") == []
   */
  protected querySelectorAll(element: Element | Document, query: string) {
    query = this.areNamespaceIgnored ? removeNamespaces(query) : escapeNamespaces(query);
    return element.querySelectorAll(query);
  }

  /**
   * Get a color from its id in the Theme's colorScheme.
   *
   * Note that Excel don't use the colors from the theme but from its own internal theme, so the displayed
   * colors will be different in the import than in excel.
   * .
   */
  private getThemeColor(colorId: string, clrScheme: XLSXColorScheme[]): string {
    switch (colorId) {
      case "0": // 0 : sysColor window text
        return "FFFFFF";
      case "1": // 1 : sysColor window background
        return "000000";
      // Don't ask me why these 2 are inverted, I cannot find any documentation for it but everyone does it
      case "2":
        return clrScheme["3"].value;
      case "3":
        return clrScheme["2"].value;
      default:
        return clrScheme[colorId].value;
    }
  }
}
