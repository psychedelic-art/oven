import { useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { EditorTool } from '../types';

interface PaintLayerProps {
  onPaint: (worldX: number, worldY: number) => void;
  onEnsureChunk: (cx: number, cy: number) => void;
  tool: EditorTool;
  chunkSize: number;
}

/**
 * Invisible plane that captures pointer events for painting.
 * Converts screen coordinates to tile coordinates.
 */
export function PaintLayer({ onPaint, onEnsureChunk, tool, chunkSize }: PaintLayerProps) {
  const isPainting = useRef(false);
  const { camera } = useThree();

  const worldToTile = useCallback(
    (point: THREE.Vector3) => {
      const tileX = Math.floor(point.x);
      const tileY = Math.floor(point.y);
      return { tileX, tileY };
    },
    []
  );

  const handlePaint = useCallback(
    (point: THREE.Vector3) => {
      if (tool !== 'paint' && tool !== 'erase') return;
      const { tileX, tileY } = worldToTile(point);
      // Ensure the chunk exists before painting
      const cx = Math.floor(tileX / chunkSize);
      const cy = Math.floor(tileY / chunkSize);
      onEnsureChunk(cx, cy);
      onPaint(tileX, tileY);
    },
    [tool, worldToTile, chunkSize, onEnsureChunk, onPaint]
  );

  const isPaintTool = tool === 'paint' || tool === 'erase';

  return (
    <mesh
      position={[0, 0, -0.01]}
      visible={false}
      onPointerDown={(e) => {
        if (!isPaintTool) return;
        e.stopPropagation();
        isPainting.current = true;
        handlePaint(e.point);
      }}
      onPointerMove={(e) => {
        if (!isPainting.current || !isPaintTool) return;
        e.stopPropagation();
        handlePaint(e.point);
      }}
      onPointerUp={() => {
        isPainting.current = false;
      }}
      onPointerLeave={() => {
        isPainting.current = false;
      }}
    >
      {/* Large invisible plane for hit detection */}
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}
