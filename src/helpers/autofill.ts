import { AutofillModifier, CoreGetters, GeneratorCell, Getters } from "..";
import { rangeTokenize } from "../formulas";
import { autofillModifiersRegistry } from "../registries/autofill_modifiers";
import { CellPosition, DIRECTION, UID, Zone } from "../types/misc";
import { PositionMap } from "./cells/position_map";
import { deepCopy } from "./misc";

export function* iterateAutofillPositions(
  sheetId: UID,
  zone: Zone,
  direction: DIRECTION
): Generator<CellPosition> {
  switch (direction) {
    case DIRECTION.DOWN:
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          yield { sheetId, col, row };
        }
      }
      break;
    case DIRECTION.UP:
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.bottom; row >= zone.top; row--) {
          yield { sheetId, col, row };
        }
      }
      break;
    case DIRECTION.LEFT:
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.right; col >= zone.left; col--) {
          yield { sheetId, col, row };
        }
      }
      break;
    case DIRECTION.RIGHT:
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          yield { sheetId, col, row };
        }
      }
      break;
  }
  return;
}

export function* createAutofillGenerator(
  getters: Getters | CoreGetters,
  sheetId: UID,
  target: Zone,
  direction: DIRECTION,
  generatorCells: GeneratorCell[]
): Generator<
  { content: string; position: CellPosition; origin: CellPosition; rule: AutofillModifier },
  void,
  unknown
> {
  const headerKey: "col" | "row" =
    direction === DIRECTION.UP || direction === DIRECTION.DOWN ? "col" : "row";

  generatorCells = deepCopy(generatorCells); // rules are mutated while being applied one after the other
  generatorCells = addMissingGenerators(sheetId, generatorCells);

  switch (direction) {
    case DIRECTION.DOWN:
      generatorCells.sort((a, b) => a.origin.row - b.origin.row);
      break;
    case DIRECTION.UP:
      generatorCells.sort((a, b) => b.origin.row - a.origin.row);
      break;
    case DIRECTION.RIGHT:
      generatorCells.sort((a, b) => a.origin.col - b.origin.col);
      break;
    case DIRECTION.LEFT:
      generatorCells.sort((a, b) => b.origin.col - a.origin.col);
      break;
  }
  const generatorCellsByHeaders = Object.groupBy(generatorCells, (g) => g.origin[headerKey]);

  // Pre-create AutofillGenerators for all cols/rows
  const generators: Record<number, AutofillGenerator> = {};
  switch (direction) {
    case DIRECTION.DOWN:
    case DIRECTION.UP:
      for (let col = target.left; col <= target.right; col++) {
        generators[col] = new AutofillGenerator(
          generatorCellsByHeaders[col] ?? [],
          getters,
          direction,
          sheetId
        );
      }
      break;
    case DIRECTION.RIGHT:
    case DIRECTION.LEFT:
      for (let row = target.top; row <= target.bottom; row++) {
        generators[row] = new AutofillGenerator(
          generatorCellsByHeaders[row] ?? [],
          getters,
          direction,
          sheetId
        );
      }
      break;
  }
  for (const position of iterateAutofillPositions(sheetId, target, direction)) {
    const generator = generators[position[headerKey]];
    const { content, origin, rule } = generator.next();
    if (rule.type !== "NO_OP_MODIFIER") {
      yield { content, origin, position, rule };
    }
  }
  return;
}

function addMissingGenerators(sheetId: UID, generatorCells: GeneratorCell[]) {
  const cols = generatorCells.map((g) => g.origin.col);
  const rows = generatorCells.map((g) => g.origin.row);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);

  const byPositions = new PositionMap<GeneratorCell>();
  for (const g of generatorCells) {
    byPositions.set(g.origin, g);
  }
  for (let col = minCol; col <= maxCol; col++) {
    for (let row = minRow; row <= maxRow; row++) {
      const pos = { sheetId, col, row };
      if (!byPositions.has(pos)) {
        byPositions.set(pos, {
          origin: pos,
          originContent: "",
          rule: { type: "NO_OP_MODIFIER" },
        });
      }
    }
  }
  return Array.from(byPositions.values());
}

/**
 * This class is used to generate the next values to autofill.
 * It's done from a selection (the source) and describe how the next values
 * should be computed.
 */
class AutofillGenerator {
  private readonly cells: GeneratorCell[];
  private readonly getters: CoreGetters; // Use correct type if available
  private index: number = 0;
  private readonly direction: DIRECTION;
  private readonly sheetId: string;

  constructor(cells: GeneratorCell[], getters: CoreGetters, direction: DIRECTION, sheetId: string) {
    this.cells = cells;
    this.getters = getters;
    this.direction = direction;
    this.sheetId = sheetId;
  }

  /**
   * Get the next value to autofill
   */
  next(): { content: string; origin: CellPosition; rule: AutofillModifier } {
    const { origin, rule, originContent } = this.cells[this.index++ % this.cells.length];
    if (!originContent) {
      return { content: "", origin, rule };
    }
    const { content } = autofillModifiersRegistry
      .get(rule.type)
      .apply(
        this.getters,
        rule,
        this.direction,
        this.sheetId,
        originContent,
        rangeTokenize(originContent)
      );
    return {
      content,
      origin,
      rule,
    };
  }
}
