/*
 * https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 * */

export class UuidGenerator {
  private isFastIdStrategy = false;

  private fastIdStart = 0;

  setIsFastStrategy(isFast: boolean) {
    this.isFastIdStrategy = isFast;
  }

  uuidv4(): string {
    if (this.isFastIdStrategy) {
      this.fastIdStart++;
      return String(this.fastIdStart);
      //@ts-ignore
    } else if (window.crypto && window.crypto.getRandomValues) {
      return "100000000".replace(/[018]/g, (c: any) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      );
    } else {
      // mainly for jest and other browsers that do not have the crypto functionality
      return "xxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  }
}
