import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { EditorTool } from '../types';

interface PaintLayerProps {
  onPaint: (worldX: number, worldY: number) => void;
  onEnsureChunk: (cx: number, cy: number) => void;
  onStampPaint?: (worldX: number, worldY: number) => void;
  onStrokeStart?: () => void;
  onStrokeEnd?: (type: string) => void;
  onCursorMove?: (worldX: number, worldY: number) => void;
  onPickTile?: (worldX: number, worldY: number) => void;
  onInspectTile?: (worldX: number, worldY: number) => void;
  tool: EditorTool;
  chunkSize: number;
}

/**
 * Invisible plane that captures pointer events for painting/stamping.
 * Converts screen coordinates to tile coordinates.
 * Supports stroke lifecycle for undo/redo batching and eyedropper (right-click).
 */
export function PaintLayer({
  onPaint,
  onEnsureChunk,
  onStampPaint,
  onStrokeStart,
  onStrokeEnd,
  onCursorMove,
  onPickTile,
  onInspectTile,
  tool,
  chunkSize,
}: PaintLayerProps) {
  const isPainting = useRef(false);

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
      if (tool === 'stamp' && onStampPaint) {
        const { tileX, tileY } = worldToTile(point);
        onStampPaint(tileX, tileY);
        return;
      }
      if (tool !== 'paint' && tool !== 'erase') return;
      const { tileX, tileY } = worldToTile(point);
      // Ensure the chunk exists before painting
      const cx = Math.floor(tileX / chunkSize);
      const cy = Math.floor(tileY / chunkSize);
      onEnsureChunk(cx, cy);
      onPaint(tileX, tileY);
    },
    [tool, worldToTile, chunkSize, onEnsureChunk, onPaint, onStampPaint]
  );

  const isPaintTool = tool === 'paint' || tool === 'erase' || tool === 'stamp';

  return (
    <mesh
      position={[0, 0, -0.01]}
      visible={false}
      onPointerDown={(e) => {
        if (!isPaintTool) return;
        // Right-click = eyedropper (pick tile under cursor) + inspect
        if (e.button === 2) {
          e.stopPropagation();
          const { tileX, tileY } = worldToTile(e.point);
          if (onPickTile) onPickTile(tileX, tileY);
          if (onInspectTile) onInspectTile(tileX, tileY);
          return;
        }
        if (e.button !== 0) return; // Only left-click for painting
        e.stopPropagation();
        isPainting.current = true;
        onStrokeStart?.();
        handlePaint(e.point);
      }}
      onPointerMove={(e) => {
        // Always report cursor position for status bar
        if (onCursorMove) {
          const { tileX, tileY } = worldToTile(e.point);
          onCursorMove(tileX, tileY);
        }
        if (!isPainting.current || !isPaintTool) return;
        e.stopPropagation();
        handlePaint(e.point);
      }}
      onPointerUp={() => {
        if (isPainting.current) {
          isPainting.current = false;
          onStrokeEnd?.(tool);
        }
      }}
      onPointerLeave={() => {
        if (isPainting.current) {
          isPainting.current = false;
          onStrokeEnd?.(tool);
        }
        onCursorMove?.(NaN, NaN); // Signal cursor left canvas
      }}
      onContextMenu={(e: any) => {
        e.nativeEvent?.preventDefault?.();
      }}
    >
      {/* Large invisible plane for hit detection */}
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}
