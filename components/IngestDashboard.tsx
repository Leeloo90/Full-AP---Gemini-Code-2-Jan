import React, { useState } from 'react';
import { Upload, HardDrive, FileVideo, Activity, AlertCircle, FileText } from 'lucide-react';
import { MediaAsset, MultiCamContainer, TranscriptWord } from '../types';
import { useMediaRegistry } from '../hooks/useRegistry';

/**
 * Interface for internal XMEML track parsing
 */
interface ContainerTrack {
  fileName: string;
  trackIndex: number;
  offsetFrames: number;
  startFrame: number;
  endFrame: number;
  duration: number;
  mediaType: 'video' | 'audio';
  in: number;
  out: number;
}

// --- Helper Functions ---

const timecodeToSeconds = (tc: string, fps: number): number => {
  const parts = tc.split(':');
  if (parts.length !== 4) return 0;
  const [h, m, s, f] = parts.map(v => parseInt(v, 10));
  return (h * 3600) + (m * 60) + s + (f / fps);
};

const secondsToTimecode = (totalSeconds: number, fps: number): string => {
  const totalFrames = Math.round(totalSeconds * fps);
  const frames = totalFrames % Math.floor(fps);
  const totalSecondsNoFrames = Math.floor(totalFrames / fps);
  const seconds = totalSecondsNoFrames % 60;
  const minutes = Math.floor(totalSecondsNoFrames / 60) % 60;
  const hours = Math.floor(totalSecondsNoFrames / 3600);

  return [hours, minutes, seconds, frames]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
};

// --- Specialized Parsers ---

const parseCsv = (content: string, mediaAssets: MediaAsset[]): MediaAsset[] => {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return mediaAssets;

  const headers = lines[0].split(',').map(h => h.trim());
  const idx = {
    file: headers.indexOf('Source File'),
    scene: headers.indexOf('Scene'),
    take: headers.indexOf('Take'),
    start: headers.indexOf('Start TC'),
    end: headers.indexOf('End TC')
  };

  if (idx.file === -1) return mediaAssets;

  const updatedAssets = [...mediaAssets];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const sourceFileName = values[idx.file];
    if (!sourceFileName) continue;

    const asset = updatedAssets.find(a => a.fileName === sourceFileName);
    if (asset) {
      if (idx.scene !== -1) asset.scene = values[idx.scene];
      if (idx.take !== -1) asset.take = values[idx.take];
      if (idx.start !== -1) asset.startTC = values[idx.start];
      if (idx.end !== -1) asset.endTC = values[idx.end];
      
      if (asset.startTC && asset.endTC) {
        const start = timecodeToSeconds(asset.startTC, asset.fps);
        const end = timecodeToSeconds(asset.endTC, asset.fps);
        asset.duration = (end - start).toFixed(2);
      }
    }
  }
  return updatedAssets;
};

const parseXml = (content: string, projectId: string): MultiCamContainer[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(content, 'text/xml');
  const containers: MultiCamContainer[] = [];

  const processNode = (node: Element) => {
    const name = node.querySelector('name')?.textContent || 'Unnamed Sync';
    const rate = node.querySelector('rate > timebase')?.textContent || '24';
    const fps = parseFloat(rate);

    const tracks: ContainerTrack[] = Array.from(node.getElementsByTagName('clipitem')).map((item, i) => {
      const inVal = parseInt(item.getElementsByTagName('in')[0]?.textContent || '0', 10);
      const outVal = parseInt(item.getElementsByTagName('out')[0]?.textContent || '0', 10);
      return {
        fileName: item.querySelector('file > name')?.textContent || '',
        trackIndex: i,
        offsetFrames: inVal,
        startFrame: parseInt(item.getElementsByTagName('start')[0]?.textContent || '0', 10),
        endFrame: parseInt(item.getElementsByTagName('end')[0]?.textContent || '0', 10),
        duration: (outVal - inVal) / fps,
        mediaType: 'video',
        in: inVal / fps,
        out: outVal / fps,
      };
    });

    containers.push({
      id: crypto.randomUUID(),
      projectId,
      name,
      tracks,
      duration: parseFloat(node.querySelector('duration')?.textContent || '0') / fps,
      fps,
      startTC: secondsToTimecode(0, fps),
    });
  };

  Array.from(xmlDoc.querySelectorAll('multiclip, sequence')).forEach(processNode);
  return containers;
};

const parseSrt = (content: string): TranscriptWord[] => {
  const words: TranscriptWord[] = [];
  const blocks = content.split(/\r?\n\r?\n/);

  blocks.forEach(block => {
    const lines = block.split(/\r?\n/);
    if (lines.length >= 3) {
      const timeParts = lines[1].split(' --> ');
      if (timeParts.length === 2) {
        const parse = (s: string) => {
          const [h, m, sec] = s.replace(',', '.').split(':');
          return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(sec);
        };
        const start = parse(timeParts[0]);
        const end = parse(timeParts[1]);
        const text = lines.slice(2).join(' ');
        const wordsInBlock = text.split(/\s+/).filter(w => w.length > 0);
        const step = (end - start) / wordsInBlock.length;

        wordsInBlock.forEach((w, i) => {
          words.push({
            id: crypto.randomUUID(),
            word: w,
            start: start + (i * step),
            end: start + ((i + 1) * step)
          });
        });
      }
    }
  });
  return words;
};

// --- Main Component ---

export const IngestDashboard: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { media, bulkUpsertMedia, bulkUpsertContainers } = useMediaRegistry(projectId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * STAGE 1: Media Ingest
   * Scans a folder for raw video and audio files.
   */
  const handleMediaIngest = async () => {
    setError(null);
    try {
      if (!window.electron) {
        setError("Electron bridge not detected.");
        return;
      }

      const selectedDir = await window.electron.selectDirectory();
      if (!selectedDir) return;

      setIsProcessing(true);
      const filesInDir = await window.electron.listFiles(selectedDir);
      
      const mediaFiles = filesInDir.filter(f => /\.(mp4|mov|mxf|wav|mp3|aif)$/i.test(f));

      const newAssets: MediaAsset[] = await Promise.all(
        mediaFiles.map(async f => {
          const fullPath = await window.electron.pathJoin(selectedDir, f);
          const isAudio = /\.(wav|mp3|aif)$/i.test(f);
          return {
            id: crypto.randomUUID(),
            fileName: f,
            projectId,
            clipDirectory: selectedDir,
            filePath: fullPath,
            mediaType: isAudio ? 'audio' : 'video',
            startTC: '00:00:00:00',
            endTC: isAudio ? '00:01:00:00' : '00:00:10:00',
            duration: isAudio ? '60' : '10',
            fps: isAudio ? 48000 : 23.976,
            resolution: isAudio ? 'Audio' : '3840x2160',
          };
        })
      );

      if (newAssets.length > 0) {
        await bulkUpsertMedia(newAssets);
      } else {
        setError("No media files found.");
      }
    } catch (err: any) {
      setError(err.message || "Media ingest failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * STAGE 2: Metadata Ingest
   * Allows picking specific XML, SRTX, or CSV files to enrich existing clips.
   */
  const handleMetadataIngest = async () => {
    setError(null);
    try {
      // 1. Open the file picker for metadata types
      const filePaths = await window.electron.selectFiles(['xml', 'srt', 'srtx', 'csv']);
      if (filePaths.length === 0) return;

      setIsProcessing(true);
      
      // Use the current media state as the starting point for updates
      let updatedMedia = [...media];
      const newContainers: MultiCamContainer[] = [];

      for (const path of filePaths) {
        const content = await window.electron.readFile(path);
        
        // Robust filename extraction regardless of / or \ slashes
        const fileName = path.replace(/^.*[\\/]/, '');
        
        console.log(`Processing metadata file: ${fileName}`);

        // --- PHASE: XMEML (XML) ---
        if (fileName.toLowerCase().endsWith('.xml')) {
          const parsed = parseXml(content, projectId);
          newContainers.push(...parsed);
          console.log(`Parsed ${parsed.length} containers from XML.`);
        } 
        
        // --- PHASE: Transcripts (SRT/SRTX) ---
        else if (/\.(srt|srtx)$/i.test(fileName)) {
          const baseName = fileName.replace(/\.(srt|srtx)$/i, '').toLowerCase().trim();
          
          // Match by checking if the media filename starts with or matches the metadata filename
          const targetIndex = updatedMedia.findIndex(a => {
            const assetBase = a.fileName.split('.')[0].toLowerCase().trim();
            return assetBase === baseName;
          });

          if (targetIndex !== -1) {
            const words = parseSrt(content);
            updatedMedia[targetIndex] = {
              ...updatedMedia[targetIndex],
              transcript: words
            };
            console.log(`Matched and attached transcript to: ${updatedMedia[targetIndex].fileName}`);
          } else {
            console.warn(`No match found for transcript: ${fileName}`);
          }
        } 
        
        // --- PHASE: Metadata (CSV) ---
        else if (fileName.toLowerCase().endsWith('.csv')) {
          updatedMedia = parseCsv(content, updatedMedia);
          console.log("CSV metadata applied to current session.");
        }
      }

      // 2. Final Persistence: Push updates to IndexedDB
      if (newContainers.length > 0) {
        await bulkUpsertContainers(newContainers);
      }

      if (updatedMedia.length > 0) {
        await bulkUpsertMedia(updatedMedia);
      }
      
      console.log("Ingest Complete. Registry has been updated.");

    } catch (err: any) {
      console.error("Metadata ingest error:", err);
      setError(err.message || "Metadata ingest failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 border-b border-slate-800 grid grid-cols-5 gap-6 relative">
      {/* Status Indicators */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-inner">
        <div className="p-3 bg-blue-900/20 text-blue-500 rounded-lg">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Vault</div>
          <div className="text-lg font-bold text-white tracking-tight">ONLINE</div>
        </div>
      </div>
      
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-inner">
        <div className="p-3 bg-emerald-900/20 text-emerald-500 rounded-lg">
          <FileVideo className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Clips</div>
          <div className="text-lg font-bold text-white tracking-tight">{media.length}</div>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-inner">
        <div className="p-3 bg-amber-900/20 text-amber-500 rounded-lg">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Process</div>
          <div className="text-lg font-bold text-white tracking-tight">
            {isProcessing ? <span className="animate-pulse">ACTIVE</span> : 'IDLE'}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <button
        onClick={handleMediaIngest}
        disabled={isProcessing}
        className="bg-slate-900 border border-emerald-600/30 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 group transition-all disabled:opacity-50"
      >
        <Upload className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">1. Import Media</span>
      </button>

      <button
        onClick={handleMetadataIngest}
        disabled={isProcessing || media.length === 0}
        className="bg-slate-900 border border-blue-600/30 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 group transition-all disabled:opacity-30 shadow-lg"
      >
        <FileText className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">2. Attach Data</span>
      </button>

      {error && (
        <div className="absolute -bottom-10 left-6 right-6 flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};