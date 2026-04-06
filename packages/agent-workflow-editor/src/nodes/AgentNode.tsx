import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { AgentNodeData } from '../store/types';

/**
 * Generic visual node component for all agent workflow node types.
 * Renders a clean card with icon, label, category badge, and connection handles.
 * Appearance is driven by the node registry data (color, icon, category).
 */
function AgentNodeComponent({ data, selected }: NodeProps<AgentNodeData>) {
  const isEnd = data.nodeSlug === 'end';

  return (
    <div
      style={{
        '--node-color': data.color,
      } as React.CSSProperties}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#666', width: 10, height: 10, border: '2px solid white' }}
      />

      {/* Node card */}
      <div
        style={{
          background: 'white',
          border: `2px solid ${selected ? data.color : '#E0E0E0'}`,
          borderRadius: 10,
          minWidth: 180,
          boxShadow: selected ? `0 0 0 2px ${data.color}40` : '0 1px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {/* Header with color accent */}
        <div
          style={{
            background: `${data.color}15`,
            borderBottom: `1px solid ${data.color}30`,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>{data.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#333',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {data.label}
            </div>
            <div style={{
              fontSize: 10,
              color: data.color,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {data.nodeSlug}
            </div>
          </div>
        </div>

        {/* Config preview (abbreviated) */}
        {!isEnd && Object.keys(data.config).length > 0 && (
          <div style={{ padding: '6px 12px', fontSize: 11, color: '#888' }}>
            {Object.entries(data.config).slice(0, 2).map(([key, val]) => (
              <div key={key} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ color: '#999' }}>{key}:</span>{' '}
                <span style={{ color: '#666' }}>{typeof val === 'string' && val.startsWith('$.') ? val : String(val).slice(0, 30)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output handles */}
      {!isEnd && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="done"
            style={{ background: data.color, width: 10, height: 10, border: '2px solid white', left: '40%' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="error"
            style={{ background: '#EF5350', width: 8, height: 8, border: '2px solid white', left: '70%' }}
          />
        </>
      )}
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
