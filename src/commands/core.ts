import { Category, Patch } from "../types/collaborative/ot_types";
import { Style, UID } from "../types/misc";
import { AbstractCommand } from "./base";

export class CoreCommandClass extends AbstractCommand {
  protected _gridDimension?: "columns" | "rows" = undefined;
  protected _isSheet: boolean = false;

  get gridDimension(): undefined | "columns" | "rows" {
    return this._gridDimension;
  }

  get isSheet(): boolean {
    return this._isSheet;
  }

  getPatch(): Patch | undefined {
    return undefined;
  }

  // getCategory(): Category {
  //   return { sheet: false, target: false, position: false, isMerge: false };
  // }
  // set isGrid(value: boolean) {
  //   this._isGrid = value;
  // }
}

export class UpdateCellCommand extends CoreCommandClass {
  constructor(
    public sheetId: UID,
    public col: number,
    public row: number,
    public content?: string,
    public style?: Style | null,
    public format?: string
  ) {
    super();
  }

  getCategory(): Category {
    return { sheet: true, target: false, position: true, isMerge: false };
  }
}

export class DeleteRowsCommand extends CoreCommandClass {
  constructor(public sheetId: UID, public rows: number[]) {
    super();
    this._gridDimension = "rows";
    this._isSheet = true;
  }

  // getCategory(): Category {
  //   return {
  //     sheet: true,
  //     target: false,
  //     position: false,
  //     isMerge: false,
  //     grid: { dimension: "rows" },
  //   };
  // }

  getPatch(): Patch | undefined {
    return { onSheet: this.sheetId, dimension: "rows", deleted: this.rows };
  }
}
