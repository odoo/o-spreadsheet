export class ScreenWidthStore {
  mutators = ["setSmallThreshhold"] as const;
  private _isSmallCallback = () => false;

  get isSmall(): boolean {
    return this._isSmallCallback();
  }

  setSmallThreshhold(isSmall: () => boolean): void {
    this._isSmallCallback = isSmall;
  }
}
