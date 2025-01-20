import { Component } from "@odoo/owl";

export class TopBarToolStore {
  mutators = ["closeDropdowns", "registerDropdown"] as const;
  private _currentDropdown: Component | null = null;

  closeDropdowns() {
    this._currentDropdown = null;
  }

  registerDropdown(dropdownComponent: Component) {
    this._currentDropdown = dropdownComponent;
  }

  get currentDropdown() {
    return this._currentDropdown;
  }
}
