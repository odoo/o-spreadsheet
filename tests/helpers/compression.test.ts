import { compress, decompress } from "../../src/helpers/compression";

describe("compression", () => {
  test("compress", async () => {
    const source = "test";
    const compressed = await compress(source);
    const decompressed = await decompress(compressed);
    expect(decompressed).toBe(source);
  });
});
