import { DisposableStore } from "../store_engine/store";
import { SheetDOMScrollInfo } from "../types/rendering";

/** Keeps the scroll position of viewports whose component can be unmounted and mounted again. */
export class ViewportScrollMemoryStore extends DisposableStore {
  // not mutators: the saved positions never affect rendering
  storeGetters = ["save", "load"] as const;

  private scrolls = new Map<string, SheetDOMScrollInfo>();

  save(key: string, scroll: SheetDOMScrollInfo) {
    this.scrolls.set(key, scroll);
  }

  load(key: string): SheetDOMScrollInfo | undefined {
    return this.scrolls.get(key);
  }
}
