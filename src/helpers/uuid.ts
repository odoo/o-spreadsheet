/*
 * https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 * */

export class UuidGenerator {
  /**
   * Generates a custom UUID using a simple 36^12 method (8-character alphanumeric string with lowercase letters)
   * This has a higher chance of collision than a UUIDv4, but not only faster to generate than an UUIDV4,
   * it also has a smaller size, which is preferable to alleviate the overall data size.
   *
   * This method is preferable when generating uuids for the core data (sheetId, figureId, etc)
   * as they will appear several times in the revisions and local history.
   *
   */
  smallUuid(): string {
    //@ts-ignore
    if (window.crypto && window.crypto.getRandomValues) {
      //@ts-ignore
      return ([1e7] + -1e3).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      );
    } else {
      // mainly for jest and other browsers that do not have the crypto functionality
      return "xxxxxxxx-xxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  }

  /**
   * Generates an UUIDV4, has astronomically low chance of collision, but is larger in size than the smallUuid.
   * This method should be used when you need to avoid collisions at all costs, like the id of a revision.
   */
  uuidv4(): string {
    //@ts-ignore
    if (window.crypto && window.crypto.getRandomValues) {
      //@ts-ignore
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      );
    } else {
      // mainly for jest and other browsers that do not have the crypto functionality
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  }
}
