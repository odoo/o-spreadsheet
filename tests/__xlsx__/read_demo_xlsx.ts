import { readFileSync } from "fs";
import JsZip from "jszip";
import { ImportedFiles } from "../../src/types/xlsx";

export enum EXCEL_TEST_FILES_PATH {
  XLSX = "./tests/__xlsx__/xlsx_demo_data.xlsx",
  XLSM = "./tests/__xlsx__/xlsm_demo_data.xlsm",
  XLTX = "./tests/__xlsx__/xltx_demo_data.xltx",
  XLTM = "./tests/__xlsx__/xltm_demo_data.xltm",
  XLAM = "./tests/__xlsx__/xlam_demo_data.xlam",
}

export async function getTextXlsxFiles(
  path: EXCEL_TEST_FILES_PATH = EXCEL_TEST_FILES_PATH.XLSX
): Promise<ImportedFiles> {
  const file = readFileSync(path);
  const jsZip = new JsZip();
  const zip = await jsZip.loadAsync(file);
  const files = Object.keys(zip.files);
  const contents = await Promise.all(
    files.map((file) =>
      file.includes("media/image") ? { imageSrc: "relative path" } : zip.files[file].async("text")
    )
  );
  const inputFiles = {};
  for (let i = 0; i < contents.length; i++) {
    inputFiles[files[i]] = contents[i];
  }

  return inputFiles;
}
