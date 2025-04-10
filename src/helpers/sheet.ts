<<<<<<< 31788df3c62e9e5416b2dcd7722bb0a49141cc05
import { HeaderIndex, Row } from "../types";
import { isDefined } from "./misc";
||||||| e2c1da20fff3c6ad2d39e320af543f66fe8beb16
import { Row } from "../types";
=======
import { Row } from "../types";
import { getUnquotedSheetName } from "./misc";
>>>>>>> ee1ac74a1d56b5a9942e80b87afc3e454852a264

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

<<<<<<< 31788df3c62e9e5416b2dcd7722bb0a49141cc05
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
||||||| e2c1da20fff3c6ad2d39e320af543f66fe8beb16
=======
export function isSheetNameEqual(name1: string | undefined, name2: string | undefined): boolean {
  if (name1 === undefined || name2 === undefined) {
    return false;
  }
  return (
    getUnquotedSheetName(name1.trim().toUpperCase()) ===
    getUnquotedSheetName(name2.trim().toUpperCase())
  );
>>>>>>> ee1ac74a1d56b5a9942e80b87afc3e454852a264
}
