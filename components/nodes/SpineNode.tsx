
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mic } from 'lucide-react';

export const SpineNode: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="min-w-[300px] bg-slate-900 border-2 border-blue-500/50 rounded-lg shadow-2xl overflow-hidden">
      <div className="bg-blue-600/10 px-4 py-2 border-b border-blue-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Spine / Truth</span>
        </div>
        <div className="text-[10px] font-mono text-blue-500">{data.duration}s</div>
      </div>
      
      <div className="p-4">
        <h4 className="text-sm font-bold text-white mb-2 truncate uppercase">{data.label}</h4>
        <div className="flex flex-wrap gap-1">
          {data.transcript?.length > 0 ? data.transcript.slice(0, 10).map((t: any) => (
            <span key={t.id} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded hover:text-white transition-colors cursor-pointer border border-transparent hover:border-blue-500/30">
              {t.word}
            </span>
          )) : (
            <div className="text-[10px] text-slate-600 italic uppercase py-2">No transcript available</div>
          )}
        </div>
      </div>

      {/* Narrative Physics Handles */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-none" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-none" />
      <Handle type="target" position={Position.Top} id="satellite-anchor" className="w-3 h-3 bg-emerald-500 border-none" />
    </div>
  );
};
