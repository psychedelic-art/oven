/**
 * Decode base64 layerData into Uint16Array of tile IDs.
 * Works in browser (no Node Buffer needed).
 */
export function decodeTileData(base64: string): Uint16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Uint16Array(bytes.buffer);
}

/**
 * Encode Uint16Array of tile IDs to base64 layerData.
 * Works in browser (no Node Buffer needed).
 */
export function encodeTileData(tiles: Uint16Array): string {
  const bytes = new Uint8Array(tiles.buffer, tiles.byteOffset, tiles.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Create a chunk key string from coordinates */
export function chunkKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Parse a chunk key back to coordinates */
export function parseChunkKey(key: string): [number, number] {
  const [x, y] = key.split(',').map(Number);
  return [x, y];
}
