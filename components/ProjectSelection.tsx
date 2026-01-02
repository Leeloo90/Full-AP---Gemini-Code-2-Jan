
import React, { useState } from 'react';
import { Plus, FolderOpen, Clock } from 'lucide-react';
import { useProjectRegistry } from '../hooks/useRegistry';
import { Project } from '../types';

interface ProjectSelectionProps {
  onSelectProject: (p: Project) => void;
}

export const ProjectSelection: React.FC<ProjectSelectionProps> = ({ onSelectProject }) => {
  const { projects, createProject, loading } = useProjectRegistry();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    const project = await createProject(newName);
    onSelectProject(project);
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-950 p-12">
      <div className="max-w-4xl w-full">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Story Graph <span className="text-blue-500">v1</span></h1>
            <p className="text-slate-500 font-medium">Fractal Narrative Laboratory</p>
          </div>
          <button 
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-xl shadow-blue-900/20"
          >
            <Plus className="w-5 h-5" />
            NEW PROJECT
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="group p-6 bg-slate-900 border border-slate-800 rounded-xl text-left hover:border-blue-500 transition-all hover:bg-slate-800/50"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-slate-800 rounded-lg group-hover:bg-blue-900/30 group-hover:text-blue-400 transition-colors">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                    <Clock className="w-3 h-3" />
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide group-hover:text-blue-400">{p.name}</h3>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.description || 'No description provided.'}</p>
              </button>
            ))}
          </div>
        )}

        {showNew && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Initialize Project</h2>
              <form onSubmit={handleCreate}>
                <input 
                  autoFocus
                  type="text"
                  placeholder="PROJECT NAME (E.G. THE LAST ACT)"
                  className="w-full bg-slate-950 border border-slate-800 p-4 rounded-lg text-white font-bold mb-6 focus:border-blue-500 outline-none uppercase placeholder:text-slate-700"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowNew(false)}
                    className="flex-1 py-3 bg-slate-800 text-slate-400 font-bold rounded-lg hover:bg-slate-700"
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500"
                  >
                    CREATE
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
