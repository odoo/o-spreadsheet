import { compile, InternalCompiledFormula } from "../../formulas/compiler";
import { toCartesian } from "../../helpers/coordinates";
import { expandRange } from "../../helpers/expand_range";
import { Position, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { NO_CHANGE, SEPARATOR } from "./squisher";

export class Unsquisher {
  private previousCell: InternalCompiledFormula | undefined;
  private alreadyAppliedNumberOffset: number[] = [];
  private previousString: string[] = [];
  private alreadyAppliedReferenceOffset: Range[] = [];

  /**
   * Expands a squished sheet object back to a full cell map.
   * For range keys like "B2:B73", fills all cells in the range with the value.
   * For single cell keys like "A1", copies as is.
   * Assumes input is an object: { [ref: string]: string | object }
   *
   * @param squished - The squished sheet object.
   * Yields [cellRef, value] for each cell in the expanded squished object.
   * @param sheetId
   * @param getRangeFromSheetXC
   */
  *unsquishSheet(
    squished: { [key: string]: any },
    sheetId: UID,
    getRangeFromSheetXC
  ): Generator<{
    position: Position;
    content?: string;
    compiled?: InternalCompiledFormula;
  }> {
    for (const key in squished) {
      if (key.includes(":")) {
        // Range key, e.g. B2:B73
        const [start, end] = key.split(":");
        for (const cell of expandRange(start, end)) {
          const result = this.unsquish(squished[key], sheetId, getRangeFromSheetXC);
          if (typeof result === "string") {
            yield { position: { col: cell[0], row: cell[1] }, content: result };
          } else {
            yield { position: { col: cell[0], row: cell[1] }, compiled: result };
          }
        }
      } else {
        // Single cell
        toCartesian(key);
        const result = this.unsquish(squished[key], sheetId, getRangeFromSheetXC);
        if (typeof result === "string") {
          yield { position: toCartesian(key), content: result };
        } else {
          yield { position: toCartesian(key), compiled: result };
        }
      }
    }
  }

  unsquish(
    squishedElement: any,
    sheetId: UID,
    getRangeFromSheetXC: (sheetId: UID, reference: string) => any
  ): string | InternalCompiledFormula {
    /*
     * 2 cases:
     * 1) squishedElement is a string -> simple formula, return as is
     * 2) squishedElement is an object -> complex formula, need to unsquish references, numbers, strings
     * */
    if (typeof squishedElement === "string") {
      if (squishedElement.startsWith("=")) {
        // simple formula
        const compiled = compile(squishedElement);
        this.previousCell = compiled;
        this.alreadyAppliedNumberOffset = new Array(compiled.literalValues.numbers.length).fill(0);
        this.previousString = compiled.literalValues.strings.map((s) => s.value);
        this.alreadyAppliedReferenceOffset = compiled.dependencies.map((ref) =>
          getRangeFromSheetXC(sheetId, ref)
        );
        return compiled;
      }

      return squishedElement;
    }
    if (typeof squishedElement === "object" && this.previousCell) {
      const current = this.previousCell;
      if (squishedElement.N !== undefined && squishedElement.N.length > 0) {
        // numbers
        current.literalValues.numbers = squishedElement.N.split(SEPARATOR).map(
          (numStr: string, index: number) => {
            if (numStr === NO_CHANGE) {
              return { value: this.alreadyAppliedNumberOffset[index] };
            } else {
              const currentOffset = parseFloat(numStr.slice(1));
              const adjustedOffset = (this.alreadyAppliedNumberOffset[index] || 0) + currentOffset;
              this.alreadyAppliedNumberOffset[index] = adjustedOffset;
              return {
                value: adjustedOffset,
              };
            }
          }
        );
      }
      if (squishedElement.S !== undefined && squishedElement.S.length > 0) {
        // strings
        current.literalValues.strings = squishedElement.S.map((str: string, index: number) => {
          if (str === NO_CHANGE) {
            return { value: this.previousString[index] };
          } else {
            this.previousString[index] = str;
            return { value: str };
          }
        });
      }
      if (squishedElement.R !== undefined && this.previousCell) {
        // references
        current.dependencies = squishedElement.R.split(SEPARATOR).map(
          (refStr: string, index: number) => {
            if (refStr === NO_CHANGE) {
              return { ...this.alreadyAppliedReferenceOffset[index] };
            } else if (refStr.startsWith("+")) {
              //offset in either row R or col C (not both)
              const offset = parseInt(refStr.slice(2), 10);

              if (refStr[1] === "R") {
                const adjustedOffset = this.alreadyAppliedReferenceOffset[index].zone.top + offset;
                const updatedRange = Object.assign({}, this.alreadyAppliedReferenceOffset[index], {
                  ...this.alreadyAppliedReferenceOffset[index].zone,
                  top: adjustedOffset,
                  bottom: adjustedOffset,
                });
                this.alreadyAppliedReferenceOffset[index] = updatedRange;
                return updatedRange;
              } else if (refStr[1] === "C") {
                const adjustedOffset = this.alreadyAppliedReferenceOffset[index].zone.left + offset;
                const updatedRange = Object.assign({}, this.alreadyAppliedReferenceOffset[index], {
                  ...this.alreadyAppliedReferenceOffset[index].zone,
                  left: adjustedOffset,
                  right: adjustedOffset,
                });
                this.alreadyAppliedReferenceOffset[index] = updatedRange;
                return updatedRange;
              } else {
                throw new Error(`Invalid reference offset format: ${refStr}`);
              }
            } else {
              // the full reference
              const fullRange = getRangeFromSheetXC(sheetId, refStr);
              this.alreadyAppliedReferenceOffset[index] = fullRange;
              return fullRange;
            }
          }
        );
      }
      return current;
    }
    throw new Error("Invalid squished element or no previous cell to unsquish against");
  }
}
