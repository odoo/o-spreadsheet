import { GridModel } from "./grid_model";
import { BorderCommand } from "./types";

// ---------------------------------------------------------------------------
// Borders
// ---------------------------------------------------------------------------
export function setBorder(this: GridModel, command: BorderCommand) {
  console.log("setting border", command);
}
