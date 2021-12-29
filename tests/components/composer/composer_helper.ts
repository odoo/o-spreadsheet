import { Model } from "../../../src/model";
import { nextTick } from "../../test_helpers/helpers";

export function getHighlights(model: Model): any[] {
  return model.getters.getHighlights();
}

export async function keydown(key: string, options: any = {}) {
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keydown", Object.assign({ key, bubbles: true }, options))
  );
  await nextTick();
  await nextTick();
}
export async function keyup(key: string, options: any = {}) {
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keyup", Object.assign({ key, bubbles: true }, options))
  );
  await nextTick();
  await nextTick();
}
