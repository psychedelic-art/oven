import { useMemo } from 'react';
import * as THREE from 'three';

interface ChunkGridProps {
  chunkSize: number;
  visibleChunks: Array<[number, number]>;
}

/**
 * Renders grid lines for visible chunks.
 * Shows chunk boundaries and individual tile grid.
 */
export function ChunkGrid({ chunkSize, visibleChunks }: ChunkGridProps) {
  const lineSegments = useMemo(() => {
    const points: THREE.Vector3[] = [];

    for (const [cx, cy] of visibleChunks) {
      const ox = cx * chunkSize;
      const oy = cy * chunkSize;

      // Chunk boundary (thick lines drawn separately)
      // Tile grid lines within chunk
      for (let i = 0; i <= chunkSize; i++) {
        // Vertical lines
        points.push(new THREE.Vector3(ox + i, oy, 0.01));
        points.push(new THREE.Vector3(ox + i, oy + chunkSize, 0.01));
        // Horizontal lines
        points.push(new THREE.Vector3(ox, oy + i, 0.01));
        points.push(new THREE.Vector3(ox + chunkSize, oy + i, 0.01));
      }
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [chunkSize, visibleChunks]);

  return (
    <lineSegments geometry={lineSegments}>
      <lineBasicMaterial color="#ffffff" opacity={0.08} transparent />
    </lineSegments>
  );
}

/**
 * Renders thick chunk boundary lines.
 */
export function ChunkBoundaries({ chunkSize, visibleChunks }: ChunkGridProps) {
  const lineSegments = useMemo(() => {
    const points: THREE.Vector3[] = [];

    for (const [cx, cy] of visibleChunks) {
      const ox = cx * chunkSize;
      const oy = cy * chunkSize;
      const s = chunkSize;

      // 4 edges of the chunk
      points.push(new THREE.Vector3(ox, oy, 0.02));
      points.push(new THREE.Vector3(ox + s, oy, 0.02));

      points.push(new THREE.Vector3(ox + s, oy, 0.02));
      points.push(new THREE.Vector3(ox + s, oy + s, 0.02));

      points.push(new THREE.Vector3(ox + s, oy + s, 0.02));
      points.push(new THREE.Vector3(ox, oy + s, 0.02));

      points.push(new THREE.Vector3(ox, oy + s, 0.02));
      points.push(new THREE.Vector3(ox, oy, 0.02));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [chunkSize, visibleChunks]);

  return (
    <lineSegments geometry={lineSegments}>
      <lineBasicMaterial color="#ffff00" opacity={0.3} transparent />
    </lineSegments>
  );
}
