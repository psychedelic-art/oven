import { useState, useEffect, useMemo } from 'react';
import type { TileDef, TilesetDef } from '../types';

export interface SpriteCache {
  /** tilesetId → full spritesheet ImageData (raw pixels) */
  sheets: Map<number, ImageData>;
  /** tileId → TileDef for O(1) lookup */
  tileLookup: Map<number, TileDef>;
  /** tilesetId → pixel dimensions per tile */
  tileDims: Map<number, { tileWidth: number; tileHeight: number }>;
  /** true once all spritesheet images have loaded (or failed) */
  ready: boolean;
}

/**
 * Loads tileset spritesheet images and extracts ImageData for pixel-level access.
 * Returns a SpriteCache with loaded sheets, tile lookup, and tile dimensions.
 *
 * Progressive: while images load, `ready=false` and `sheets` is empty.
 * Components can fall back to solid colorHex until sprites are available.
 */
export function useSpriteLoader(
  tilesets: TilesetDef[],
  tiles: TileDef[],
): SpriteCache {
  const [sheets, setSheets] = useState<Map<number, ImageData>>(new Map());
  const [ready, setReady] = useState(false);

  // Build tile lookup map (pure, synchronous)
  const tileLookup = useMemo(() => {
    const map = new Map<number, TileDef>();
    for (const t of tiles) {
      map.set(t.tileId, t);
    }
    return map;
  }, [tiles]);

  // Build tile dimensions map (pure, synchronous)
  const tileDims = useMemo(() => {
    const map = new Map<number, { tileWidth: number; tileHeight: number }>();
    for (const ts of tilesets) {
      map.set(ts.id, { tileWidth: ts.tileWidth, tileHeight: ts.tileHeight });
    }
    return map;
  }, [tilesets]);

  // Load spritesheet images asynchronously
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const newSheets = new Map<number, ImageData>();

      const loadPromises = tilesets
        .filter(ts => ts.imagePath != null)
        .map(async (ts) => {
          try {
            const img = await loadImage(ts.imagePath!);

            // Draw to offscreen canvas to extract pixel data
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            newSheets.set(ts.id, imageData);
          } catch (err) {
            console.warn(`[useSpriteLoader] Skipping tileset ${ts.id} (${ts.name}):`, err);
          }
        });

      await Promise.all(loadPromises);

      if (!cancelled) {
        setSheets(newSheets);
        setReady(true);
      }
    }

    if (tilesets.length > 0) {
      setReady(false);
      loadAll();
    } else {
      setReady(true);
    }

    return () => { cancelled = true; };
  }, [tilesets]);

  return { sheets, tileLookup, tileDims, ready };
}

/**
 * Load an image element from a URL. Returns a promise that resolves when loaded.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// ---------------------------------------------------------------------------
// Pixel-copy utilities for building DataTexture buffers
// ---------------------------------------------------------------------------

/**
 * Copy a single tile's sprite pixels from the spritesheet ImageData
 * into the target RGBA buffer at the given tile grid position.
 *
 * Handles Y-flip: ImageData is top-to-bottom, THREE.js DataTexture is bottom-to-top.
 *
 * @param target   Output Uint8Array (RGBA, row-major)
 * @param targetW  Width of target texture in pixels
 * @param tileX    Tile column in the target grid (0-based)
 * @param tileY    Tile row in the target grid (0-based)
 * @param sheet    Source spritesheet ImageData
 * @param spriteX  Column index in spritesheet tile grid (0-based)
 * @param spriteY  Row index in spritesheet tile grid (0-based)
 * @param tileW    Tile width in pixels
 * @param tileH    Tile height in pixels
 * @param alpha    Override alpha (0-255), or -1 to use source alpha
 */
export function copySpriteTile(
  target: Uint8Array,
  targetW: number,
  tileX: number,
  tileY: number,
  sheet: ImageData,
  spriteX: number,
  spriteY: number,
  tileW: number,
  tileH: number,
  alpha: number = -1,
): void {
  const sheetW = sheet.width;
  const srcData = sheet.data; // Uint8ClampedArray, RGBA, top-to-bottom
  const srcBaseX = spriteX * tileW;
  const srcBaseY = spriteY * tileH;

  for (let py = 0; py < tileH; py++) {
    for (let px = 0; px < tileW; px++) {
      // Source pixel (top-to-bottom in ImageData)
      const srcIdx = ((srcBaseY + py) * sheetW + (srcBaseX + px)) * 4;

      // Destination pixel — DataTexture row 0 = bottom of rendered image.
      // tileY=0 is the bottom tile row. Within each tile, flip the sprite
      // so that the top of the sprite image maps to the top of the tile region.
      const destX = tileX * tileW + px;
      const destY = tileY * tileH + (tileH - 1 - py);
      const destIdx = (destY * targetW + destX) * 4;

      target[destIdx] = srcData[srcIdx];         // R
      target[destIdx + 1] = srcData[srcIdx + 1]; // G
      target[destIdx + 2] = srcData[srcIdx + 2]; // B
      target[destIdx + 3] = alpha >= 0 ? alpha : srcData[srcIdx + 3]; // A
    }
  }
}

/**
 * Copy a tile's sprite pixels from the spritesheet, handling the case where
 * the source tile size (from its tileset) differs from the destination cell
 * size (the global max across all tilesets).
 *
 * Uses nearest-neighbor scaling to fill the ENTIRE destination cell.
 * When src < dest, pixels are scaled up. When src === dest, 1:1 copy.
 *
 * @param target    Output Uint8Array (RGBA, row-major)
 * @param targetW   Width of target texture in pixels
 * @param tileX     Tile column in the target grid (0-based)
 * @param tileY     Tile row in the target grid (0-based)
 * @param sheet     Source spritesheet ImageData
 * @param spriteX   Column index in spritesheet tile grid (0-based)
 * @param spriteY   Row index in spritesheet tile grid (0-based)
 * @param srcTileW  Source tile width in pixels (actual tileset tile size)
 * @param srcTileH  Source tile height in pixels (actual tileset tile size)
 * @param destTileW Destination cell width in pixels (global max)
 * @param destTileH Destination cell height in pixels (global max)
 * @param alpha     Override alpha (0-255), or -1 to use source alpha
 */
export function copySpriteTileMixed(
  target: Uint8Array,
  targetW: number,
  tileX: number,
  tileY: number,
  sheet: ImageData,
  spriteX: number,
  spriteY: number,
  srcTileW: number,
  srcTileH: number,
  destTileW: number,
  destTileH: number,
  alpha: number = -1,
): void {
  // If source and dest are the same, use the fast path
  if (srcTileW === destTileW && srcTileH === destTileH) {
    copySpriteTile(target, targetW, tileX, tileY, sheet, spriteX, spriteY, srcTileW, srcTileH, alpha);
    return;
  }

  const sheetW = sheet.width;
  const srcData = sheet.data;
  const srcBaseX = spriteX * srcTileW;
  const srcBaseY = spriteY * srcTileH;

  // Fill the ENTIRE dest cell using nearest-neighbor scaling.
  // This avoids black gaps when srcTile is smaller than destTile.
  for (let py = 0; py < destTileH; py++) {
    for (let px = 0; px < destTileW; px++) {
      // Map dest pixel → source pixel (nearest-neighbor)
      const srcPx = Math.min(Math.floor(px * srcTileW / destTileW), srcTileW - 1);
      const srcPy = Math.min(Math.floor(py * srcTileH / destTileH), srcTileH - 1);
      const srcIdx = ((srcBaseY + srcPy) * sheetW + (srcBaseX + srcPx)) * 4;

      // Y-flip for THREE.js DataTexture (row 0 = bottom)
      const destX = tileX * destTileW + px;
      const destY = tileY * destTileH + (destTileH - 1 - py);
      const destIdx = (destY * targetW + destX) * 4;

      target[destIdx] = srcData[srcIdx];
      target[destIdx + 1] = srcData[srcIdx + 1];
      target[destIdx + 2] = srcData[srcIdx + 2];
      target[destIdx + 3] = alpha >= 0 ? alpha : srcData[srcIdx + 3];
    }
  }
}

/**
 * Fill a tile region with a solid RGBA color (fallback when no spritesheet).
 */
export function fillSolidTile(
  target: Uint8Array,
  targetW: number,
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
  r: number,
  g: number,
  b: number,
  a: number = 255,
): void {
  for (let py = 0; py < tileH; py++) {
    for (let px = 0; px < tileW; px++) {
      const destX = tileX * tileW + px;
      const destY = tileY * tileH + py;
      const destIdx = (destY * targetW + destX) * 4;
      target[destIdx] = r;
      target[destIdx + 1] = g;
      target[destIdx + 2] = b;
      target[destIdx + 3] = a;
    }
  }
}
