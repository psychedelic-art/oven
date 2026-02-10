import { useMemo } from 'react';
import * as THREE from 'three';
import type { ChunkData, TileDef } from '../types';

interface ChunkMeshProps {
  chunk: ChunkData;
  chunkSize: number;
  tiles: TileDef[];
  tileColorMap: Map<number, THREE.Color>;
}

/**
 * Renders a single chunk as an InstancedMesh of colored 1x1 planes.
 * Uses a single DataTexture for the entire chunk for best performance.
 */
export function ChunkMesh({ chunk, chunkSize, tileColorMap }: ChunkMeshProps) {
  const { texture, position } = useMemo(() => {
    // Build an RGBA texture from tile data
    const size = chunkSize;
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const tileId = chunk.tiles[y * size + x];
        const color = tileColorMap.get(tileId);
        const idx = (y * size + x) * 4;
        if (color) {
          data[idx] = Math.round(color.r * 255);
          data[idx + 1] = Math.round(color.g * 255);
          data[idx + 2] = Math.round(color.b * 255);
          data[idx + 3] = 255;
        } else {
          // Unknown tile — dark magenta
          data[idx] = 128;
          data[idx + 1] = 0;
          data[idx + 2] = 128;
          data[idx + 3] = 255;
        }
      }
    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;

    // Position: chunk origin in world space (bottom-left corner)
    const pos: [number, number, number] = [
      chunk.chunkX * size + size / 2,
      chunk.chunkY * size + size / 2,
      0,
    ];

    return { texture: tex, position: pos };
  }, [chunk, chunkSize, tileColorMap]);

  return (
    <mesh position={position}>
      <planeGeometry args={[chunkSize, chunkSize]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
