import { Registry } from "../registry";
import { Cell, CellDisplayProperties, CoreGetters, Format, UID } from "../types";

//------------------------------------------------------------------------------
// Cell Registry
//------------------------------------------------------------------------------

/**
 * Instanciate a cell object based on a raw string content.
 */
export interface CellBuilder {
  sequence: number;
  /**
   * Check if this factory should be used
   */
  match: (content: string, format: Format | undefined) => boolean;
  createCell: (
    id: UID,
    content: string,
    properties: CellDisplayProperties,
    sheetId: UID,
    getters: CoreGetters
  ) => Cell;
}

/**
 * This registry is intended to map a cell content (raw string) to
 * an instance of a cell.
 */
export const cellRegistry = new Registry<CellBuilder>();
