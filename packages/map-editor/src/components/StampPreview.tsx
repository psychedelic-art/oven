import { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import type { EditorTool, StampPattern } from '../types';
import type { SpriteCache } from '../hooks/useSpriteLoader';
import { copySpriteTileMixed, fillSolidTile } from '../hooks/useSpriteLoader';

interface StampPreviewProps {
  tool: EditorTool;
  activeStamp: StampPattern | null;
  tileColorMap: Map<number, THREE.Color>;
  spriteCache: SpriteCache;
}

/**
 * Shows a semi-transparent preview of the stamp pattern under the cursor.
 * Only visible when tool === 'stamp' and a stamp pattern is active.
 * When spritesheet data is available, renders actual sprite textures.
 */
export function StampPreview({ tool, activeStamp, tileColorMap, spriteCache }: StampPreviewProps) {
  const [pos, setPos] = useState<[number, number] | null>(null);

  const isStampTool = tool === 'stamp' && activeStamp != null;

  const handleMove = useCallback(
    (e: any) => {
      if (!isStampTool) {
        setPos(null);
        return;
      }
      const tileX = Math.floor(e.point.x);
      const tileY = Math.floor(e.point.y);
      setPos([tileX, tileY]);
    },
    [isStampTool]
  );

  // Build a DataTexture for the stamp pattern (with sprite support)
  const stampTexture = useMemo(() => {
    if (!activeStamp) return null;
    const { width, height, tiles } = activeStamp;
    const { sheets, tileLookup, tileDims, ready } = spriteCache;

    // Determine pixel dimensions per tile
    let tileW = 1;
    let tileH = 1;
    if (ready && tileDims.size > 0) {
      for (const [, dims] of tileDims) {
        tileW = Math.max(tileW, dims.tileWidth);
        tileH = Math.max(tileH, dims.tileHeight);
      }
    }

    const texW = width * tileW;
    const texH = height * tileH;
    const data = new Uint8Array(texW * texH * 4);
    const emptyColor = new THREE.Color('#1a1a2e');

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileId = tiles[y * width + x];
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
              180, // semi-transparent for preview
            );
            copied = true;
          }
        }

        // Fallback: solid color
        if (!copied) {
          const color = tileColorMap.get(tileId) ?? emptyColor;
          fillSolidTile(
            data, texW,
            x, y,
            tileW, tileH,
            Math.round(color.r * 255),
            Math.round(color.g * 255),
            Math.round(color.b * 255),
            180,
          );
        }
      }
    }

    const tex = new THREE.DataTexture(data, texW, texH, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, [activeStamp, tileColorMap, spriteCache]);

  if (!isStampTool) return null;

  return (
    <>
      {/* Invisible plane for hover detection */}
      <mesh
        position={[0, 0, -0.004]}
        visible={false}
        onPointerMove={handleMove}
        onPointerLeave={() => setPos(null)}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Stamp preview */}
      {pos && activeStamp && stampTexture && (
        <mesh
          position={[
            pos[0] + activeStamp.width / 2,
            pos[1] + activeStamp.height / 2,
            0.035,
          ]}
        >
          <planeGeometry args={[activeStamp.width, activeStamp.height]} />
          <meshBasicMaterial
            map={stampTexture}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      )}
    </>
  );
}
