import { AutoCompleteProposal, AutoCompleteProvider } from "../../../registries";
import { SpreadsheetStore } from "../../../stores";

export class AutoCompleteStore extends SpreadsheetStore {
  selectedIndex: number | undefined = undefined;
  provider: AutoCompleteProvider | undefined;

  get selectedProposal(): AutoCompleteProposal | undefined {
    if (this.selectedIndex === undefined || this.provider === undefined) {
      return undefined;
    }
    return this.provider.proposals[this.selectedIndex];
  }

  useProvider(provider: AutoCompleteProvider) {
    this.provider = provider;
    this.selectedIndex = provider.autoSelectFirstProposal ? 0 : undefined;
  }

  hide() {
    this.provider = undefined;
    this.selectedIndex = undefined;
  }

  selectIndex(index: number) {
    this.selectedIndex = index;
  }

  moveSelection(direction: "previous" | "next") {
    if (!this.provider) {
      return;
    }
    if (this.selectedIndex === undefined) {
      this.selectedIndex = 0;
      return;
    }
    if (direction === "next") {
      this.selectedIndex--;
      if (this.selectedIndex < 0) {
        this.selectedIndex = this.provider.proposals.length - 1;
      }
    } else {
      this.selectedIndex = (this.selectedIndex + 1) % this.provider.proposals.length;
    }
  }
}
