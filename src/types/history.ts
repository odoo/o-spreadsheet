import { Branch } from "../history/branch";
import { Operation } from "../history/operation";
import { UID } from "./misc";

export interface CreateRevisionOptions {
  revisionId?: UID;
  clientId?: UID;
  pending?: boolean;
}

export interface HistoryChange {
  key: string;
  target: any;
  before: any;
}

export type { WorkbookHistory } from "@odoo/o-spreadsheet-engine/types/history";

export type Transformation<T = unknown> = (dataToTransform: T) => T;

export interface TransformationFactory<T = unknown> {
  /**
   * Build a transformation function to transform any operation as if the execution of
   * a previous `operation` was omitted.
   */
  without: (operation: T) => Transformation<T>;
  /**
   * Build a transformation function to transform any operation as if a new `operation` was
   * executed before.
   */
  with: (operation: T) => Transformation<T>;
}

export interface OperationSequenceNode<T> {
  operation: Operation<T>;
  branch: Branch<T>;
  isCancelled: boolean;
  next?: {
    operation: Operation<T>;
    branch: Branch<T>;
  };
}
