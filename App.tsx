
import React, { useState, useEffect } from 'react';
import { Database, LayoutDashboard, Share2, ArrowLeft, Download } from 'lucide-react';
import { ProjectSelection } from './components/ProjectSelection';
import { IngestDashboard } from './components/IngestDashboard';
import { MediaTable } from './components/MediaTable';
import { CanvasPage } from './components/CanvasPage';
import { Project } from './types';
import { useStore } from './store/useStore';
import { flattenCanvasToTimeline } from './utils/Sequencer';

type AppView = 'selection' | 'vault' | 'canvas';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('selection');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const { setProjectId, nodes, edges } = useStore();

  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    setProjectId(project.id);
    setCurrentView('vault');
  };

  const handleBackToSelection = () => {
    setActiveProject(null);
    setCurrentView('selection');
  };

  const handleExport = () => {
    const xml = flattenCanvasToTimeline(nodes, edges);
    if (!xml) {
      alert("No media found on canvas to export.");
      return;
    }

    // In a browser/electron hybrid, we'll trigger a download
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject?.name || 'story-graph'}_export.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-slate-200 font-sans">
      {/* Global Header */}
      {currentView !== 'selection' && activeProject && (
        <header className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToSelection}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-slate-800 mx-2" />
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black block leading-none mb-1">
                Active Project
              </span>
              <span className="text-sm font-bold text-white uppercase truncate max-w-[200px] block">
                {activeProject.name}
              </span>
            </div>
          </div>

          <nav className="flex bg-slate-950 border border-slate-800 rounded-full p-1">
            <button
              onClick={() => setCurrentView('vault')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-widest transition-all ${
                currentView === 'vault' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              SMART VAULT
            </button>
            <button
              onClick={() => setCurrentView('canvas')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-widest transition-all ${
                currentView === 'canvas' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              NARRATIVE CANVAS
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black tracking-widest transition-all shadow-lg shadow-blue-900/20"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT XML
            </button>
          </div>
        </header>
      )}

      {/* View Orchestration */}
      <main className="flex-1 overflow-hidden relative">
        {currentView === 'selection' && (
          <ProjectSelection onSelectProject={handleSelectProject} />
        )}
        {currentView === 'vault' && activeProject && (
          <div className="h-full flex flex-col">
            <IngestDashboard projectId={activeProject.id} />
            <div className="flex-1 overflow-hidden">
              <MediaTable projectId={activeProject.id} />
            </div>
          </div>
        )}
        {currentView === 'canvas' && activeProject && (
          <CanvasPage projectId={activeProject.id} />
        )}
      </main>
    </div>
  );
};

export default App;
