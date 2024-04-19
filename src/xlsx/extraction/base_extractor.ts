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
import { DEFAULT_SYSTEM_COLOR } from "../conversion";
import { fixXlsxUnicode } from "../helpers/misc";
import { XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import { escapeQueryNameSpaces } from "../helpers/xml_helpers";
import { XLSXImageFile } from "./../../types/xlsx";

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
    if (this.value === "true") return true; // for files exported from Libre Office
    if (this.value === "false") return false;
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

  /**
   * /!\ Important : There should be no namespaces in the tags of the XML files.
   *
   * This class use native querySelector and querySelectorAll, that's used for HTML (not XML). These aren't supposed to
   * handled namespaces, as they are not supported by the HTML specification. Some implementations (most browsers) do
   * actually support namespaces, but some don't (e.g. jsdom).
   *
   * The namespace should be escaped as with NAMESPACE string (eg. <t:foo> => <NAMESPACEtNAMESPACEfoo>).
   */
  constructor(
    rootFile: XLSXImportFile,
    xlsxStructure: XLSXFileStructure,
    warningManager: XLSXImportWarningManager
  ) {
    this.rootFile = rootFile;
    this.currentFile = rootFile.file.fileName;
    this.xlsxFileStructure = xlsxStructure;
    this.warningManager = warningManager;
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
  protected getListOfXMLFiles(): XLSXImportFile[] {
    const XMLFiles = Object.entries(this.xlsxFileStructure)
      .filter(([key]) => key !== "images")
      .map(([_, value]) => value)
      .flat()
      .filter(isDefined);
    return XMLFiles;
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
      rgb = rgb === DEFAULT_SYSTEM_COLOR ? undefined : rgb;
    }
    const color = {
      rgb: rgb || defaultColor,
      auto: this.extractAttr(colorElement, "auto")?.asBool(),
      indexed: this.extractAttr(colorElement, "indexed")?.asNum(),
      tint: this.extractAttr(colorElement, "tint")?.asNum(),
    };
    return color;
  }

  /**
   * Returns the xml file targeted by a relationship.
   */
  protected getTargetXmlFile(relationship: XLSXRel): XLSXImportFile {
    if (!relationship) throw new Error("Undefined target file");
    const target = this.processRelationshipTargetName(relationship.target);
    // Use "endsWith" because targets are relative paths, and we know the files by their absolute path.
    const f = this.getListOfXMLFiles().find((f) => f.file.fileName.endsWith(target));
    if (!f || !f.file) throw new Error("Cannot find target file");
    return f;
  }

  /**
   * Returns the image parameters targeted by a relationship.
   */
  protected getTargetImageFile(relationship: XLSXRel): XLSXImageFile {
    if (!relationship) throw new Error("Undefined target file");
    const target = this.processRelationshipTargetName(relationship.target);
    // Use "endsWith" because targets are relative paths, and we know the files by their absolute path.
    const f = this.xlsxFileStructure.images.find((f) => f.fileName.endsWith(target));
    if (!f) throw new Error("Cannot find target file");
    return f;
  }

  protected querySelector(element: Element | Document, query: string) {
    const escapedQuery = escapeQueryNameSpaces(query);
    return element.querySelector(escapedQuery);
  }

  protected querySelectorAll(element: Element | Document, query: string) {
    const escapedQuery = escapeQueryNameSpaces(query);
    return element.querySelectorAll(escapedQuery);
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

  /** Remove signs of relative path. */
  private processRelationshipTargetName(targetName: string): string {
    return targetName.replace(/\.+\//, "");
  }
}
