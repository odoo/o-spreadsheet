import { Session } from "@odoo/o-spreadsheet-engine/collaborative/session";
import { ClientPosition } from "../../src";

const originalSessionMove = Session.prototype.move;

/**
 * Patch the `session.move` method to remove debounce.
 * This is useful for testing purposes, to ensure that there aren't indeterministic test because a render
 * happens in the middle of the test when the debounce is executed.
 */
export function patchSessionMove() {
  Session.prototype.move = function (this: Session, position: ClientPosition) {
    this["_move"](position);
  };
}

/**
 * Remove the patch on `session.move` method that remove debounce.
 */
export function unPatchSessionMove() {
  Session.prototype.move = originalSessionMove;
}
