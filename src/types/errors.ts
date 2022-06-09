import { _lt } from "../translation";

export class InvalidReferenceError extends Error {
  constructor() {
    super(_lt("Invalid reference"));
  }
}
