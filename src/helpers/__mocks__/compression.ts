/*
 * JEST doesn't support TextEncoder, or Streams, or Blob (with arrayBuffer property) so
 * the mock implementation is a simple conversion.
 * This mock only support characters with character code <= 255 (so ascii)
 * */

export async function compress(str: string): Promise<Uint8Array> {
  let result = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    result[i] = str.charCodeAt(i);
  }
  return result;
}

export async function decompress(compressedBytes: Uint8Array): Promise<string> {
  return String.fromCharCode(...compressedBytes);
}
