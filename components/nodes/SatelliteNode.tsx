
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Image } from 'lucide-react';

export const SatelliteNode: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="min-w-[200px] bg-slate-900 border border-emerald-500/30 rounded-lg shadow-xl overflow-hidden">
      <div className="aspect-video bg-slate-950 relative group">
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors">
          <Image className="w-8 h-8 text-emerald-900" />
        </div>
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded text-[9px] font-mono text-emerald-500 border border-emerald-900">
          {data.duration}s
        </div>
      </div>
      
      <div className="p-3">
        <h4 className="text-[11px] font-bold text-slate-300 uppercase truncate">{data.label}</h4>
      </div>

      <Handle type="source" position={Position.Bottom} id="anchor" className="w-3 h-3 bg-emerald-500 border-none" />
    </div>
  );
};
