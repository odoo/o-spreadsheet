/**
 * Convert a string to its UTF-8 bytes and compress it.
 */
export async function compress(str: string): Promise<Uint8Array> {
  const stream = new Blob([str]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
  const chunks: Uint8Array[] = [];
  // @ts-ignore uses nodejs16 that creates a warning.
  for await (const chunk of compressedStream) {
    chunks.push(chunk);
  }
  return await concatUint8Arrays(chunks);
}

/**
 * Decompress bytes into a UTF-8 string.
 */
export async function decompress(compressedBytes: Uint8Array): Promise<string> {
  const stream = new Blob([compressedBytes]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"));
  const chunks: Uint8Array[] = [];
  // @ts-ignore uses nodejs16 that creates a warning.
  for await (const chunk of decompressedStream) {
    chunks.push(chunk);
  }
  const stringBytes = await concatUint8Arrays(chunks);
  return new TextDecoder().decode(stringBytes);
}

/**
 * Combine multiple Uint8Arrays into one.
 */
async function concatUint8Arrays(uint8arrays: Uint8Array[]): Promise<Uint8Array> {
  const blob = new Blob(uint8arrays);
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}
