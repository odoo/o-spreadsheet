import { menuProvider } from "./menu_controller";
import { Providers, StateNotifier } from "./providers";

export const menuStyleProvider = (providers: Providers) => {
  console.log("create menuStyleProvider");
  // should only get the state!
  const contextMenu = providers.watch(menuProvider);
  return new ContextMenuStyle(contextMenu.state.isOpen);
};

export class ContextMenuStyle extends StateNotifier<{ isOpen: boolean }> {
  constructor(isOpen: boolean) {
    super({ isOpen });
  }
}
