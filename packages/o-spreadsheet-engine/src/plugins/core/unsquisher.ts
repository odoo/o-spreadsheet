import { BananaCompiledFormula, compile } from "../../formulas/compiler";
import { expandOne, expandRange } from "../../helpers/expand_range";
import { Position, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { NO_CHANGE, SEPARATOR } from "./squisher";

export class Unsquisher {
  private previousCell: BananaCompiledFormula | undefined;
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
    getRangeFromSheetXC: (sheetId: UID, reference: string) => Range
  ): Generator<{
    position: Position;
    content?: string;
    compiled?: BananaCompiledFormula;
  }> {
    for (const key in squished) {
      if (squished[key] === undefined || squished[key] === null) {
        continue; // skip empty entries
      }
      if (typeof squished[key] === "string" && squished[key].startsWith("=")) {
        // compile the found formula. Reset previousCell and offsets because it's a new formula
        const compiled = compile(squished[key], sheetId);
        this.previousCell = compiled;
        this.alreadyAppliedNumberOffset = new Array(compiled.literalValues.numbers.length).fill(0);
        this.previousString = compiled.literalValues.strings.map((s) => s.value);
        this.alreadyAppliedReferenceOffset = compiled.dependencies.map((ref) =>
          getRangeFromSheetXC(sheetId, ref)
        );
      }
      const parts = key.split(":");
      let generator: Generator<[number, number], any, any>;
      if (parts.length === 1) {
        generator = expandOne(key);
      } else {
        generator = expandRange(parts[0], parts[1]);
      }
      for (const cell of generator) {
        if (typeof squished[key] === "string" && squished[key].startsWith("=")) {
          // we can reuse the compiled formula for all cells in the range
          yield { position: { col: cell[0], row: cell[1] }, compiled: this.previousCell };
        } else {
          const result = this.unsquish(squished[key], sheetId, getRangeFromSheetXC);
          if (typeof result === "string") {
            yield { position: { col: cell[0], row: cell[1] }, content: result };
          } else {
            yield { position: { col: cell[0], row: cell[1] }, compiled: result };
          }
        }
      }
    }
  }

  unsquish(
    squishedElement: any,
    sheetId: UID,
    getRangeFromSheetXC: (sheetId: UID, reference: string) => Range
  ): string | BananaCompiledFormula {
    if (typeof squishedElement === "string") {
      if (squishedElement.startsWith("=")) {
        throw new Error(
          "Programming Error: Formula strings should have been handled by the caller"
        );
      }
      // plain string content
      return squishedElement;
    }
    if (typeof squishedElement === "object" && this.previousCell) {
      const current: { numbers: any[]; strings: any[]; dependencies: any[] } = {
        numbers: [],
        strings: [],
        dependencies: [],
      };
      if (squishedElement.N !== undefined && squishedElement.N.length > 0) {
        current.numbers = squishedElement.N.split(SEPARATOR).map(this.adjustNumbers);
      }
      if (squishedElement.S !== undefined && squishedElement.S.length > 0) {
        current.strings = squishedElement.S.map(this.adjustStrings);
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
                const updatedRange: Range = Object.assign(
                  {},
                  this.alreadyAppliedReferenceOffset[index]
                );
                updatedRange.zone = updatedRange.unboundedZone = Object.assign(
                  {},
                  updatedRange.zone,
                  {
                    top: adjustedOffset,
                    bottom: adjustedOffset,
                  }
                );
                this.alreadyAppliedReferenceOffset[index] = updatedRange;
                return updatedRange;
              } else if (refStr[1] === "C") {
                const adjustedOffset = this.alreadyAppliedReferenceOffset[index].zone.left + offset;
                const updatedRange: Range = Object.assign(
                  {},
                  this.alreadyAppliedReferenceOffset[index],
                  {
                    ...this.alreadyAppliedReferenceOffset[index].zone,
                    left: adjustedOffset,
                    right: adjustedOffset,
                  }
                );
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
      return BananaCompiledFormula.CopyWithDependenciesAndLiteral(
        this.previousCell,
        sheetId,
        current.dependencies,
        current.numbers,
        current.strings
      );
    }
    throw new Error("Invalid squished element or no previous cell to unsquish against");
  }

  private adjustStrings = (str: string, index: number): { value: string } => {
    if (str === NO_CHANGE) {
      return { value: this.previousString[index] };
    } else {
      this.previousString[index] = str;
      return { value: str };
    }
  };

  private adjustNumbers = (numStr: string, index: number): { value: number } => {
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
  };
}
