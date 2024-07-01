/**
 * Convert a string to its UTF-8 bytes and compress it.
 */
export async function compress(inputString: string): Promise<string> {
  const inputBytes = new TextEncoder().encode(inputString);
  const inputStream = new Blob([inputBytes]).stream();
  const compressedStream = inputStream.pipeThrough(new CompressionStream("gzip"));

  const chunks: Uint8Array[] = [];
  // @ts-ignore
  for await (const chunk of compressedStream) {
    chunks.push(chunk);
  }
  const compressedBytes = await concatUint8Arrays(chunks);
  return uint8ArrayToBase64(compressedBytes);
}

/**
 * Convert a Uint8Array to a base64 string.
 */
function uint8ArrayToBase64(uint8array: Uint8Array) {
  let binaryString = "";
  const chunkSize = 0x8000; // Arbitrary chunk size
  for (let i = 0; i < uint8array.length; i += chunkSize) {
    const chunk = uint8array.subarray(i, i + chunkSize);
    // @ts-ignore
    binaryString += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binaryString);
}

/**
 * Combine multiple Uint8Arrays into one.
 */
async function concatUint8Arrays(uint8arrays: Uint8Array[]): Promise<Uint8Array> {
  const blob = new Blob(uint8arrays);
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Decompress bytes into a UTF-8 string.
 */
export async function decompress(compressed: string): Promise<string> {
  const binaryString = atob(compressed);

  // Create a Uint8Array from the binary string
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const compressedStream = new Blob([bytes]).stream();
  const decompressedStream = compressedStream.pipeThrough(new DecompressionStream("gzip"));

  // Collect the decompressed chunks
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  // @ts-ignore
  for await (const chunk of decompressedStream) {
    chunks.push(chunk);
    totalLength += chunk.length;
  }

  // Concatenate all chunks into a single Uint8Array
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(result);
}
