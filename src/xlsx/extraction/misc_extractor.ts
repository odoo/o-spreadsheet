import { XLSXColorScheme, XLSXTheme } from "../../types/xlsx";
import { AUTO_COLOR } from "../constants";
import { XlsxBaseExtractor } from "./base_extractor";

/**
 * XLSX Extractor class that can be used for either sharedString XML files or theme XML files.
 *
 * Since they both are quite simple, it make sense to make a single class to manage them all, to avoid unnecessary file
 * cluttering.
 */
export class XlsxMiscExtractor extends XlsxBaseExtractor {
  getTheme(): XLSXTheme {
    const clrScheme = this.mapOnElements(
      { query: "a:clrScheme", parent: this.rootFile.file.xml, children: true },
      (element): XLSXColorScheme => {
        return {
          name: element.tagName,
          value: this.extractChildAttr(element, 0, "val", {
            required: true,
            default: AUTO_COLOR,
          }).asString()!,
          lastClr: this.extractChildAttr(element, 0, "lastClr", {
            default: AUTO_COLOR,
          }).asString(),
        };
      }
    );
    return { clrScheme };
  }

  /**
   * Get the array of shared strings of the XLSX.
   *
   * Worth noting that running a prettier on the xml can mess up some strings, since there is an option in the
   * xmls to keep the spacing and not trim the string.
   */
  getSharedStrings(): string[] {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "si" },
      (ssElement): string => {
        // Shared string can either be a simple text, or a rich text (text with formatting, possibly in multiple parts)
        if (ssElement.children[0].tagName === "t") {
          return this.extractTextContent(ssElement) || "";
        }
        // We don't support rich text formatting, we'll only extract the text
        else {
          return this.mapOnElements({ parent: ssElement, query: "t" }, (textElement): string => {
            return this.extractTextContent(textElement) || "";
          }).join("");
        }
      }
    );
  }
}
