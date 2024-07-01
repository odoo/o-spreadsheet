import { compress, decompress } from "../../src/helpers/compression";

describe("compression mock test", () => {
  test.each(["test", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgjiklmnopqrstuvwxyz0123456789/*-+=;@|#¼"])(
    "compress %s",
    async (source) => {
      const compressed = await compress(source);
      const decompressed = await decompress(compressed);
      expect(decompressed).toBe(source);
    }
  );

  test("mock compress DO NOT support non ascii character", async () => {
    const compressed = await compress("😀");
    const decompressed = await decompress(compressed);
    expect(decompressed === "😀").toBeFalsy();
  });
});
