import { BorderCommand, GridState } from "./state";

// ---------------------------------------------------------------------------
// Borders
// ---------------------------------------------------------------------------
export function setBorder(state: GridState, command: BorderCommand) {
  console.log("setting border", command, state);
}
