/*
 * https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 * */

export class UuidGenerator {
  // Helper to get a crypto object in any environment
  private getCrypto(): Crypto | undefined {
    if (typeof globalThis !== "undefined" && globalThis.crypto) {
      return globalThis.crypto;
    }
    // Node.js: try to require('crypto').webcrypto
    if (typeof require === "function") {
      try {
        const askKindly = require; // prevent odoo bundler to try to resolve 'crypto' module
        const nodeCrypto = askKindly("crypto");
        if (nodeCrypto.webcrypto) {
          return nodeCrypto.webcrypto;
        }
      } catch (e) {
        // ignore
      }
    }
    return undefined;
  }

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
    const cryptoObj = this.getCrypto();
    if (cryptoObj) {
      return "10000000-1000".replace(/[01]/g, (c) => {
        const n = Number(c);
        return (n ^ (cryptoObj.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(
          16
        );
      });
    } else {
      // mainly for jest and other browsers that do not have the crypto functionality
      return "xxxxxxxx-xxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  }

  /**
   * Generates an UUIDV4, has astronomically low chance of collision, but is larger in size than the smallUuid.
   * This method should be used when you need to avoid collisions at all costs, like the id of a revision.
   */
  uuidv4(): string {
    const cryptoObj = this.getCrypto();
    if (cryptoObj) {
      return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
        const n = Number(c);
        return (n ^ (cryptoObj.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(
          16
        );
      });
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
