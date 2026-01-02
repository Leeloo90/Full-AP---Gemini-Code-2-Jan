
import React from 'react';
import { Maximize2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const SceneNode: React.FC<{ id: string, data: any }> = ({ id, data }) => {
  const enterIsolation = useStore(s => s.enterIsolation);

  return (
    <div className="w-[400px] h-[300px] bg-slate-900/30 border-2 border-slate-700 rounded-xl relative group">
      <div className="absolute top-4 left-4 flex items-center justify-between w-[calc(100%-32px)]">
        <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Scene // {data.label}</span>
        <button 
          onClick={() => enterIsolation(id)}
          className="p-1.5 bg-slate-800 rounded hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Maximize2 className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
};
