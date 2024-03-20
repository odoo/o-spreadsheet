import { readFileSync } from "fs";
import JsZip from "jszip";
import { ImportedFiles } from "../../src/types/xlsx";

const PATH = "./tests/__xlsx__/xlsx_demo_data.xlsx";

export async function getTextXlsxFiles(): Promise<ImportedFiles> {
  const file = readFileSync(PATH);
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
