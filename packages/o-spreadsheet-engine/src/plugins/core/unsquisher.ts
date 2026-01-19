import { CompiledFormula, compile } from "../../formulas/compiler";
import { expandOne, expandRange } from "../../helpers/expand_range";
import { Position, UID } from "../../types/misc";
import { Range } from "../../types/range";
import { NO_CHANGE, SEPARATOR } from "./squisher";

export class Unsquisher {
  private previousCell: CompiledFormula | undefined;
  private alreadyAppliedNumberOffset: number[] = [];
  private previousString: string[] = [];
  private alreadyAppliedReferenceOffset: Range[] = [];
  private previousTransformation: { N: string; S: string[]; R: string } | undefined = undefined;

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
    compiled?: CompiledFormula;
  }> {
    for (const key in squished) {
      if (squished[key] === undefined || squished[key] === null || squished[key] === "") {
        continue; // skip empty entries
      }
      if (typeof squished[key] === "string" && squished[key].startsWith("=")) {
        // compile the found formula. Reset previousCell and offsets because it's a new formula
        const compiled = compile(squished[key], sheetId);
        compiled.convertXCDependenciesToRange(getRangeFromSheetXC, sheetId);
        this.previousCell = compiled;
        this.alreadyAppliedNumberOffset = compiled.literalValues.numbers.map((n) => n.value);
        this.previousString = compiled.literalValues.strings.map((s) => s.value);
        this.alreadyAppliedReferenceOffset = compiled.rangeDependencies.map((r) => r);
        this.previousTransformation = undefined;
      }
      const parts = key.split(":");
      let positionsGenerator: Generator<[number, number], any, any>;
      if (parts.length === 1) {
        positionsGenerator = expandOne(key);
      } else {
        positionsGenerator = expandRange(parts[0], parts[1]);
      }
      for (const cell of positionsGenerator) {
        let current = squished[key];
        if (typeof current === "string") {
          if (current.startsWith("=")) {
            // we can use the compiled formula for all cells in the range
            yield { position: { col: cell[0], row: cell[1] }, compiled: this.previousCell };
          } else {
            // plain string content for all cells in the range
            yield { position: { col: cell[0], row: cell[1] }, content: current };
          }
        } else {
          // the current cell is an object, let's see if there is a transformation
          if (!current.N && !current.S && !current.R) {
            // empty cell with object content means "same as last time" on another position
            if (this.previousTransformation === undefined) {
              // no previous transformation to refer to, so just reuse the previous cell
              yield { position: { col: cell[0], row: cell[1] }, compiled: this.previousCell };
            } else {
              // the transformation empty so it is the same as the previous cell transformation
              current = this.previousTransformation;
            }
          } else {
            this.previousTransformation = current;
          }
          const result = this.unsquish(current, sheetId, getRangeFromSheetXC);
          yield { position: { col: cell[0], row: cell[1] }, compiled: result };
        }
      }
    }
  }

  private unsquish(
    squishedElement: any,
    sheetId: UID,
    getRangeFromSheetXC: (sheetId: UID, reference: string) => Range
  ): CompiledFormula {
    if (typeof squishedElement === "string") {
      if (squishedElement.startsWith("=")) {
        throw new Error(
          "Programming Error: Formula strings should have been handled by the caller"
        );
      }
      // plain string content
      throw new Error(
        "Programming Error: non formula string should have been handled by the caller"
      );
    }
    if (typeof squishedElement === "object" && this.previousCell) {
      const current: { numbers: any[]; strings: any[]; dependencies: any[] } = {
        numbers: [],
        strings: [],
        dependencies: [],
      };
      if (squishedElement.N !== undefined && squishedElement.N.length > 0) {
        current.numbers = squishedElement.N.split(SEPARATOR).map(this.adjustNumbers);
      } else {
        current.numbers = this.previousCell.literalValues.numbers;
      }
      if (squishedElement.S !== undefined && squishedElement.S.length > 0) {
        current.strings = squishedElement.S.map(this.adjustStrings);
      } else {
        current.strings = this.previousCell.literalValues.strings;
      }
      if (squishedElement.R !== undefined && this.previousCell) {
        // references
        let references: string[];
        if (typeof squishedElement.R !== "string") {
          // special case when sheets names contains the separator
          references = squishedElement.R;
        } else {
          references = squishedElement.R.split(SEPARATOR);
        }
        current.dependencies = references.map((refStr: string, index: number) => {
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
                this.alreadyAppliedReferenceOffset[index]
              );
              updatedRange.zone = updatedRange.unboundedZone = Object.assign(
                {},
                updatedRange.zone,
                {
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
        });
      } else {
        current.dependencies = this.previousCell.rangeDependencies;
      }
      return CompiledFormula.CopyWithDependenciesAndLiteral(
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
