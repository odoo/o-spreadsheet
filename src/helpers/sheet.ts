import { _t } from "../translation";
import { HeaderIndex, Row } from "../types";
import { isDefined } from "./misc";

export function createDefaultRows(rowNumber: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < rowNumber; i++) {
    const row = {
      cells: {},
    };
    rows.push(row);
  }
  return rows;
}

export function moveHeaderIndexesOnHeaderAddition(
  indexHeaderAdded: HeaderIndex,
  numberAdded: number,
  headers: HeaderIndex[]
): HeaderIndex[] {
  return headers.map((header) => {
    if (header >= indexHeaderAdded) {
      return header + numberAdded;
    }
    return header;
  });
}

export function moveHeaderIndexesOnHeaderDeletion(
  deletedHeaders: HeaderIndex[],
  headers: HeaderIndex[]
): HeaderIndex[] {
  deletedHeaders = [...deletedHeaders].sort((a, b) => b - a);
  return headers
    .map((header) => {
      for (const deletedHeader of deletedHeaders) {
        if (header > deletedHeader) {
          header--;
        } else if (header === deletedHeader) {
          return undefined;
        }
      }
      return header;
    })
    .filter(isDefined);
}

export function getNextSheetName(existingNames: string[], baseName: string = "Sheet"): string {
  let i = 1;
  let name = `${baseName}${i}`;
  while (existingNames.includes(name)) {
    name = `${baseName}${i}`;
    i++;
  }
  return name;
}

export function getDuplicateSheetName(nameToDuplicate: string, existingNames: string[]): string {
  let i = 1;
  const baseName = _t("Copy of %s", nameToDuplicate);
  let name = baseName.toString();
  while (existingNames.includes(name)) {
    name = `${baseName} (${i})`;
    i++;
  }
  return name;
}
