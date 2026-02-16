import { useMemo } from 'react';
import * as THREE from 'three';
import type { ChunkData } from '../types';
import type { SpriteCache } from '../hooks/useSpriteLoader';
import { copySpriteTileMixed, fillSolidTile } from '../hooks/useSpriteLoader';

interface ChunkMeshProps {
  chunk: ChunkData;
  chunkSize: number;
  tileColorMap: Map<number, THREE.Color>;
  spriteCache: SpriteCache;
}

/**
 * Renders a single chunk as a textured plane.
 * When spritesheet data is available, creates a high-resolution texture
 * with actual sprite pixels. Falls back to solid colorHex per tile.
 */
export function ChunkMesh({ chunk, chunkSize, tileColorMap, spriteCache }: ChunkMeshProps) {
  const { texture, position } = useMemo(() => {
    const { sheets, tileLookup, tileDims, ready } = spriteCache;

    // Determine pixel dimensions per tile from first available tileset.
    // Default to 1 (= original 32×32 color texture) if no tilesets loaded yet.
    let tileW = 1;
    let tileH = 1;
    if (ready && tileDims.size > 0) {
      for (const [, dims] of tileDims) {
        tileW = Math.max(tileW, dims.tileWidth);
        tileH = Math.max(tileH, dims.tileHeight);
      }
    }

    const texW = chunkSize * tileW;
    const texH = chunkSize * tileH;
    const data = new Uint8Array(texW * texH * 4);

    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const tileId = chunk.tiles[y * chunkSize + x];
        const tileDef = tileLookup.get(tileId);

        // Try spritesheet copy
        let copied = false;
        if (
          tileDef &&
          tileDef.tilesetId != null &&
          tileDef.spriteX != null &&
          tileDef.spriteY != null
        ) {
          const sheet = sheets.get(tileDef.tilesetId);
          const dims = tileDims.get(tileDef.tilesetId);
          if (sheet && dims) {
            copySpriteTileMixed(
              data, texW,
              x, y,
              sheet,
              tileDef.spriteX, tileDef.spriteY,
              dims.tileWidth, dims.tileHeight, // source: actual tileset dims
              tileW, tileH,                     // dest: global max cell size
            );
            copied = true;
          }
        }

        // Fallback: solid color
        if (!copied) {
          const color = tileColorMap.get(tileId);
          if (color) {
            fillSolidTile(
              data, texW,
              x, y,
              tileW, tileH,
              Math.round(color.r * 255),
              Math.round(color.g * 255),
              Math.round(color.b * 255),
              255,
            );
          } else {
            // Unknown tile — dark magenta
            fillSolidTile(data, texW, x, y, tileW, tileH, 128, 0, 128, 255);
          }
        }
      }
    }

    const tex = new THREE.DataTexture(data, texW, texH, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;

    // Position: chunk origin in world space (bottom-left corner + half size)
    const pos: [number, number, number] = [
      chunk.chunkX * chunkSize + chunkSize / 2,
      chunk.chunkY * chunkSize + chunkSize / 2,
      0,
    ];

    return { texture: tex, position: pos };
  }, [chunk, chunkSize, tileColorMap, spriteCache]);

  return (
    <mesh position={position}>
      <planeGeometry args={[chunkSize, chunkSize]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
