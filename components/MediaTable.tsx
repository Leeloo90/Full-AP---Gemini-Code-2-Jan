
import React from 'react';
import { Film, AudioWaveform, MoreHorizontal, GripVertical } from 'lucide-react';
import { useMediaRegistry } from '../hooks/useRegistry';

export const MediaTable: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { media } = useMediaRegistry(projectId);

  const onDragStart = (event: React.DragEvent, assetId: string) => {
    event.dataTransfer.setData('application/storygraph-asset', assetId);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase text-slate-500 tracking-widest">Master Vault ({media.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-sm z-10">
            <tr className="border-b border-slate-800">
              <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-600">Name</th>
              <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-600">In Point</th>
              <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-600">Duration</th>
              <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-600">Format</th>
              <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {media.map((asset) => (
              <tr 
                key={asset.fileName}
                draggable
                onDragStart={(e) => onDragStart(e, asset.fileName)}
                className="group border-b border-slate-900 hover:bg-blue-900/10 transition-colors cursor-grab active:cursor-grabbing"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-slate-800 group-hover:text-blue-600" />
                    <div className={`p-2 rounded ${asset.mediaType === 'video' ? 'bg-emerald-900/20 text-emerald-500' : 'bg-blue-900/20 text-blue-500'}`}>
                      {asset.mediaType === 'video' ? <Film className="w-4 h-4" /> : <AudioWaveform className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white uppercase group-hover:text-blue-400">{asset.fileName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{asset.filePath}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-slate-400">{asset.startTC}</td>
                <td className="px-6 py-4 text-xs font-mono text-slate-400">{asset.duration}s</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-black uppercase text-slate-500">
                    {asset.resolution} @ {asset.fps}fps
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {media.length === 0 && (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <div className="text-slate-700 uppercase font-black tracking-widest text-sm">Vault Empty</div>
                  <div className="text-slate-800 text-xs mt-2 uppercase">Run ingest to populate assets</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
