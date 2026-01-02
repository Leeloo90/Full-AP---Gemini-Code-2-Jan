
import React, { useState } from 'react';
import { Upload, HardDrive, FileVideo, Activity, AlertCircle } from 'lucide-react';
import { MediaAsset } from '../types';
import { useMediaRegistry } from '../hooks/useRegistry';

export const IngestDashboard: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { media, bulkUpsertMedia } = useMediaRegistry(projectId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManualIngest = async () => {
    setError(null);
    try {
      if (!window.electron) {
        setError("Electron bridge not detected. Please run in the Story Graph host.");
        return;
      }

      const selectedDir = await window.electron.selectDirectory();
      if (!selectedDir) return;

      setIsProcessing(true);
      const files = await window.electron.listFiles(selectedDir);
      
      const videoFiles = files.filter(f => /\.(mp4|mov|mxf)$/i.test(f));
      const audioFiles = files.filter(f => /\.(wav|mp3|aif)$/i.test(f));

      const newAssets: MediaAsset[] = [
        ...videoFiles.map(f => ({
          fileName: f,
          projectId,
          clipDirectory: selectedDir,
          startTC: '00:00:00:00',
          endTC: '00:00:10:00',
          duration: '10', // Still a string in UI, but we ensure it's numeric when used in store
          fps: 23.976,
          resolution: '3840x2160',
          filePath: `${selectedDir}/${f}`,
          mediaType: 'video' as const
        })),
        ...audioFiles.map(f => ({
          fileName: f,
          projectId,
          clipDirectory: selectedDir,
          startTC: '00:00:00:00',
          endTC: '00:01:00:00',
          duration: '60',
          fps: 48000,
          resolution: 'Audio',
          filePath: `${selectedDir}/${f}`,
          mediaType: 'audio' as const
        }))
      ];

      if (newAssets.length > 0) {
        await bulkUpsertMedia(newAssets);
      } else {
        setError("No compatible media files found in selection.");
      }
    } catch (err: any) {
      console.error('Ingest failed:', err);
      setError(err.message || "Ingest process failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 border-b border-slate-800 grid grid-cols-4 gap-6 relative">
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-inner">
        <div className="p-3 bg-blue-900/20 text-blue-500 rounded-lg">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Storage Pool</div>
          <div className="text-lg font-bold text-white tracking-tight">READY</div>
        </div>
      </div>
      
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-inner">
        <div className="p-3 bg-emerald-900/20 text-emerald-500 rounded-lg">
          <FileVideo className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Asset Count</div>
          <div className="text-lg font-bold text-white tracking-tight">{media.length} Clips</div>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-inner">
        <div className="p-3 bg-amber-900/20 text-amber-500 rounded-lg">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Sync Status</div>
          <div className="text-lg font-bold text-white tracking-tight">
            {isProcessing ? <span className="animate-pulse">SCANNING...</span> : 'STABLE'}
          </div>
        </div>
      </div>

      <button
        onClick={handleManualIngest}
        disabled={isProcessing}
        className="bg-slate-900 border border-blue-600/30 hover:border-blue-500 rounded-xl p-4 flex items-center justify-center gap-3 group transition-all disabled:opacity-50 hover:bg-blue-600/5 shadow-lg"
      >
        {isProcessing ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
        ) : (
          <Upload className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
        )}
        <span className="text-sm font-black uppercase text-blue-500 tracking-widest">Initialize Ingest</span>
      </button>

      {error && (
        <div className="absolute -bottom-10 left-6 right-6 flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-in slide-in-from-top-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};
