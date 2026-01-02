
import React from 'react';
import { BaseEdge, EdgeProps, getSimpleBezierPath } from '@xyflow/react';

export const AnchorEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getSimpleBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge 
        id={id} 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: '#10B981', 
          strokeWidth: 1, 
          strokeDasharray: '4',
          opacity: 0.6
        }} 
      />
      <circle cx={sourceX} cy={sourceY} fill="#10B981" r={3} />
      <circle cx={targetX} cy={targetY} fill="#10B981" r={3} />
    </>
  );
};
