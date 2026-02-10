import { useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import type { EditorTool } from '../types';

interface CursorHighlightProps {
  tool: EditorTool;
}

/**
 * Shows a highlight square on the tile under the cursor.
 */
export function CursorHighlight({ tool }: CursorHighlightProps) {
  const [pos, setPos] = useState<[number, number, number] | null>(null);

  const isPaintTool = tool === 'paint' || tool === 'erase';

  const handleMove = useCallback(
    (e: any) => {
      if (!isPaintTool) {
        setPos(null);
        return;
      }
      const tileX = Math.floor(e.point.x) + 0.5;
      const tileY = Math.floor(e.point.y) + 0.5;
      setPos([tileX, tileY, 0.03]);
    },
    [isPaintTool]
  );

  if (!pos || !isPaintTool) return null;

  return (
    <>
      {/* Invisible plane for hover detection */}
      <mesh
        position={[0, 0, -0.005]}
        visible={false}
        onPointerMove={handleMove}
        onPointerLeave={() => setPos(null)}
      >
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Highlight square */}
      {pos && (
        <mesh position={pos}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={tool === 'erase' ? '#ff4444' : '#44ff44'}
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </mesh>
      )}
    </>
  );
}
