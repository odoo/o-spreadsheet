import { lstatSync, readdirSync, readFileSync } from "fs";
import { ImportedFiles } from "../../src/types/xlsx";

const PATH = "./tests/__xlsx__/xlsx_demo_data/";

export function getTextXlsxFiles(): ImportedFiles {
  const importedFilesPaths = importDir(PATH);

  const importedFiles = {};
  for (let path of Object.keys(importedFilesPaths)) {
    const cleanPath = path.substring(PATH.length);
    importedFiles[cleanPath] = importedFilesPaths[path];
  }

  return importedFiles;
}

function importDir(path: string): ImportedFiles {
  let importedFiles = {};
  readdirSync(path).forEach((file) => {
    const filePath = path + file;
    if (lstatSync(filePath).isDirectory()) {
      const subDirFiles = importDir(filePath + "/");
      importedFiles = { ...importedFiles, ...subDirFiles };
    } else {
      const fileContent = readFileSync(filePath, "utf-8");
      importedFiles[filePath] = fileContent;
    }
  });

  return importedFiles;
}
