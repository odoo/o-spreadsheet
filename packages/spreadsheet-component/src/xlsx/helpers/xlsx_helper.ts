import { XLSXImportFile, XLSXXmlDocuments } from "../../types/xlsx";
import { CONTENT_TYPES_FILE } from "../constants";
import { XLSXExportFile, XLSXExportXMLFile } from "./../../types/xlsx";

/**
 * Return all the xmls converted to XLSXImportFile corresponding to the given content type.
 */
export function getXLSXFilesOfType(contentType: string, xmls: XLSXXmlDocuments): XLSXImportFile[] {
  const paths = getPathsOfContent(contentType, xmls);
  return getXlsxFile(paths, xmls);
}

/**
 * Return whether an exported file is an XML file or other kinds of file (e.g. image)
 */
export function isXLSXExportXMLFile(file: XLSXExportFile): file is XLSXExportXMLFile {
  return "content" in file;
}

/**
 * From an array of file path, return the equivalents XLSXFiles. An XLSX File is composed of an XML,
 * and optionally of a relationships XML.
 */
function getXlsxFile(files: string[], xmls: XLSXXmlDocuments): XLSXImportFile[] {
  const ret: XLSXImportFile[] = [];
  for (let file of files) {
    const rels = getRelationFile(file, xmls);
    ret.push({
      file: { fileName: file, xml: xmls[file] },
      rels: rels ? { fileName: rels, xml: xmls[rels] } : undefined,
    });
  }
  return ret;
}

/**
 * Return all the path of the files in a XLSX directory that have content of the given type.
 */
function getPathsOfContent(contentType: string, xmls: XLSXXmlDocuments): string[] {
  const xml = xmls[CONTENT_TYPES_FILE];

  const sheetItems = xml.querySelectorAll(`Override[ContentType="${contentType}"]`);

  const paths: string[] = [];
  for (let item of sheetItems) {
    const file = item?.attributes["PartName"].value;
    paths.push(file.substring(1)); // Remove the heading "/"
  }

  return paths;
}

/**
 * Get the corresponding relationship file for a given xml file in a XLSX directory.
 */
function getRelationFile(file: string, xmls: XLSXXmlDocuments): string | undefined {
  if (file === CONTENT_TYPES_FILE) {
    return "_rels/.rels";
  }

  let relsFile: string | undefined = "";
  const pathParts = file.split("/");
  for (let i = 0; i < pathParts.length - 1; i++) {
    relsFile += pathParts[i] + "/";
  }
  relsFile += "_rels/";
  relsFile += pathParts[pathParts.length - 1] + ".rels";

  if (!xmls[relsFile]) {
    relsFile = undefined;
  }

  return relsFile;
}
