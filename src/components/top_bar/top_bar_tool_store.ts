import { Component } from "@odoo/owl";

/**
 * This store is used to manage the dropdown that is currently
 * opened after clicking an item on the toolbar.
 * It can only have one displayed at a time.
 *
 */
export class TopBarToolStore {
  mutators = ["closeDropdowns", "openDropdown"] as const;
  private _currentDropdown: Component | null = null;

  closeDropdowns() {
    this._currentDropdown = null;
  }

  openDropdown(dropdownComponent: Component) {
    this._currentDropdown = dropdownComponent;
  }

  get currentDropdown() {
    return this._currentDropdown;
  }
}
