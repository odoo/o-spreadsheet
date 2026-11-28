import { Plugin, signal } from "@odoo/owl";
import {
  AutoCompleteProposal,
  AutoCompleteProvider,
} from "../../../registries/auto_completes/auto_complete_registry";

export class AutoCompletePlugin extends Plugin {
  selectedIndex = signal<number | undefined>(undefined);
  provider = signal<AutoCompleteProvider | undefined>(undefined);

  get selectedProposal(): AutoCompleteProposal | undefined {
    const provider = this.provider();
    const selectedIndex = this.selectedIndex();
    if (selectedIndex === undefined || provider === undefined) {
      return undefined;
    }
    return provider.proposals[selectedIndex];
  }

  useProvider(provider: AutoCompleteProvider) {
    this.provider.set(provider);
    this.selectedIndex.set(provider.autoSelectFirstProposal ? 0 : undefined);
  }

  hide() {
    this.provider.set(undefined);
    this.selectedIndex.set(undefined);
  }

  selectIndex(index: number) {
    this.selectedIndex.set(index);
  }

  moveSelection(direction: "previous" | "next") {
    const provider = this.provider();
    const selectedIndex = this.selectedIndex();
    if (!provider) {
      return;
    }
    if (selectedIndex === undefined) {
      this.selectedIndex.set(0);
      return;
    }
    if (direction === "previous") {
      const next = selectedIndex - 1;
      this.selectedIndex.set(next < 0 ? provider.proposals.length - 1 : next);
    } else {
      this.selectedIndex.set((selectedIndex + 1) % provider.proposals.length);
    }
  }
}
