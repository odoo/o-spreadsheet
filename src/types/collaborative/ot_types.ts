import { CoreCommand, UID, Zone } from "..";
import {
  expandZoneOnInsertion,
  isDefined,
  isInside,
  overlap,
  reduceZoneOnDeletion,
} from "../../helpers";

export type SheetCommand = Extract<CoreCommand, { sheetId: UID }>;

export type PositionalCommand = Extract<CoreCommand, { col: number; row: number }>;

export type TargetCommand = Extract<CoreCommand, { target: Zone[] }>;

export type ColumnsCommand = Extract<CoreCommand, { sheetId: UID; columns: number[] }>;

export type RowsCommand = Extract<CoreCommand, { sheetId: UID; rows: number[] }>;

export interface Patch {
  deletedSheet?: UID;
  onSheet?: UID;
  dimension?: "columns" | "rows";
  added?: {
    position: "before" | "after";
    quantity: number;
    base: number;
  };
  deleted?: number[];
  mergeZone?: Zone;
}

export function createPatch(cmd: CoreCommand): Patch | undefined {
  switch (cmd.type) {
    case "REMOVE_COLUMNS":
      return { onSheet: cmd.sheetId, dimension: "columns", deleted: cmd.columns };
    case "REMOVE_ROWS":
      return { onSheet: cmd.sheetId, dimension: "rows", deleted: cmd.rows };
    case "ADD_COLUMNS":
      return {
        onSheet: cmd.sheetId,
        dimension: "columns",
        added: { position: cmd.position, quantity: cmd.quantity, base: cmd.column },
      };
    case "ADD_ROWS":
      return {
        onSheet: cmd.sheetId,
        dimension: "rows",
        added: { position: cmd.position, quantity: cmd.quantity, base: cmd.row },
      };
    case "DELETE_SHEET":
      return { deletedSheet: cmd.sheetId };
    case "ADD_MERGE":
      return { onSheet: cmd.sheetId, mergeZone: cmd.zone };
  }
  return undefined;
}

export interface Category {
  sheet: boolean;
  target: boolean;
  position: boolean;
  grid?: {
    dimension: "columns" | "rows";
  };
  isMerge: boolean;
}

export function categorize(cmd: CoreCommand): Category {
  const cat: Category = { sheet: false, target: false, position: false, isMerge: false };
  if ("sheetId" in cmd) {
    cat.sheet = true;
  }
  if ("target" in cmd) {
    cat.target = true;
  }
  if ("col" in cmd && "row" in cmd) {
    cat.position = true;
  }
  switch (cmd.type) {
    case "ADD_COLUMNS":
    case "REMOVE_COLUMNS":
    case "RESIZE_COLUMNS":
      cat.grid = { dimension: "columns" };
      break;
    case "ADD_ROWS":
    case "REMOVE_ROWS":
    case "RESIZE_ROWS":
      cat.grid = { dimension: "rows" };
      break;
    case "ADD_MERGE":
    case "REMOVE_MERGE":
      cat.isMerge = true;
  }
  return cat;
}

//TODO Remove null, it's just for using tryTransform with existing transform
export function tryTransform(
  cmd: CoreCommand,
  executed: CoreCommand
): CoreCommand | null | undefined {
  const patch = createPatch(executed);
  const cat = categorize(cmd);
  if (!patch) {
    return null;
  }
  if (cat.sheet && cmd["sheetId"] === patch.deletedSheet) {
    return undefined;
  }
  if (cat.sheet && cmd["sheetId"] !== patch.onSheet) {
    return cmd;
  }
  if (cat.position) {
    //@ts-ignore
    const col: number = cmd.col;
    //@ts-ignore
    const row: number = cmd.row;
    if (patch.deleted) {
      let base = patch.dimension === "columns" ? col : row;
      if (patch.deleted.includes(base)) {
        return undefined;
      }
      for (let removedElement of patch.deleted) {
        if (base >= removedElement) {
          base--;
        }
      }
      return { ...cmd, [patch.dimension === "columns" ? "col" : "row"]: base };
    }
    if (patch.added) {
      let base = patch.dimension === "columns" ? col : row;
      if (
        base > patch.added.base ||
        (base === patch.added.base && patch.added.position === "before")
      ) {
        return {
          ...cmd,
          [patch.dimension === "columns" ? "col" : "row"]: base + patch.added.quantity,
        };
      }
      return cmd;
    }
    if (patch.mergeZone) {
      const sameTopLeft = col === patch.mergeZone.left && row === patch.mergeZone.top;
      if (sameTopLeft || !isInside(col, row, patch.mergeZone)) {
        return cmd;
      }
      return undefined;
    }
  }
  if (cat.target) {
    const target: Zone[] = [];
    for (const zone of cmd["target"]) {
      let newZone: Zone | undefined = { ...zone };
      if (patch.deleted) {
        newZone = reduceZoneOnDeletion(
          zone,
          patch.dimension === "columns" ? "left" : "top",
          patch.deleted
        );
      }
      if (patch.added) {
        newZone = expandZoneOnInsertion(
          zone,
          patch.dimension!,
          patch.added.base,
          patch.added.position,
          patch.added.quantity
        );
      }
      if (newZone) {
        target.push(newZone);
      }
    }
    if (!target.length) {
      return undefined;
    }
    // @ts-ignore A ce state vu que c'est cat.target on sait que c'est bon
    return { ...cmd, target };
  }

  if (cat.isMerge && patch.mergeZone) {
    if (overlap(cmd["zone"], patch.mergeZone)) {
      return undefined;
    }
    return cmd;
  }

  if (cat.grid) {
    if (patch.deleted) {
      let dim: string = cat.grid.dimension;
      let withS = true;
      if (!(dim in cmd)) {
        withS = false;
        dim = dim.slice(0, -1);
      }
      let elements: number[] = cmd[dim];
      if (!withS) {
        elements = [cmd[dim]];
      }
      elements = elements
        .map((element) => {
          if (patch.deleted!.includes(element)) {
            return undefined;
          }
          for (let removedElement of patch.deleted!) {
            if (element > removedElement) {
              element--;
            }
          }
          return element;
        })
        .filter(isDefined);
      if (elements.length) {
        if (withS) {
          return { ...cmd, [dim]: elements };
        }
        return { ...cmd, [dim]: elements[0] };
      }
      return undefined;
    }
    if (patch.added) {
      let dim: string = cat.grid.dimension;
      let withS = true;
      if (!(dim in cmd)) {
        withS = false;
        dim = dim.slice(0, -1);
      }
      let elements: number[] = cmd[dim];
      if (!withS) {
        elements = [cmd[dim]];
      }
      const base = patch.added.position === "before" ? patch.added.base - 1 : patch.added.base;
      elements = elements.map((el) => (el > base ? el + patch.added!.quantity : el));
      if (withS) {
        return { ...cmd, [dim]: elements };
      }
      return { ...cmd, [dim]: elements[0] };
    }
  }

  if (cat.isMerge) {
    // This should be "merged" with cat.target, as zone is the same as a target with one element
    const zone: Zone = cmd["zone"];
    let newZone: Zone | undefined = { ...zone };
    if (patch.deleted) {
      newZone = reduceZoneOnDeletion(
        zone,
        patch.dimension === "columns" ? "left" : "top",
        patch.deleted
      );
    }
    if (patch.added) {
      newZone = expandZoneOnInsertion(
        zone,
        patch.dimension!,
        patch.added.base,
        patch.added.position,
        patch.added.quantity
      );
    }
    if (newZone) {
      // @ts-ignore A ce state vu que c'est cat.isMerge on sait que c'est bon
      return { ...cmd, zone: newZone };
    }
    return undefined;
  }

  return null;
}
