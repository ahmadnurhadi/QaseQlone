import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Project } from '../types';
import { Plus, Folder, MoreVertical, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', code: '', description: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projs);
    });
    return unsubscribe;
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewProject({ name: '', code: '', description: '' });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Repositories</h2>
            <p className="text-slate-500">Manage your testing repositories and test cases</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Repository
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link 
            key={project.id} 
            to={`/projects/${project.id}`}
            className="bg-white border border-slate-200 rounded-xl p-6 hover:border-primary hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Folder className="w-6 h-6" />
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{project.name}</h3>
            <p className="text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">{project.code}</p>
            <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10">{project.description || 'No description provided.'}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">Created {project.createdAt ? formatDate(project.createdAt.toDate()) : 'just now'}</span>
              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Create New Repository</h3>
              <p className="text-xs text-slate-500 mt-1">Set up a new space for your test suites and cases.</p>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Repository Name</label>
                  <span className="text-[10px] text-slate-400 font-medium">Required</span>
                </div>
                <input 
                  required
                  type="text" 
                  value={newProject.name}
                  onChange={e => setNewProject({...newProject, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  placeholder="e.g. E-commerce Web App"
                />
                <p className="text-[10px] text-slate-400">A descriptive name for your testing project.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Repository Code</label>
                  <span className="text-[10px] text-slate-400 font-medium">Required</span>
                </div>
                <input 
                  required
                  type="text" 
                  maxLength={10}
                  value={newProject.code}
                  onChange={e => setNewProject({...newProject, code: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm"
                  placeholder="e.g. WEB"
                />
                <p className="text-[10px] text-slate-400">Short unique identifier used for test case IDs (e.g. WEB-1).</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Description</label>
                <textarea 
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-24 resize-none text-sm"
                  placeholder="Briefly describe the scope of this repository..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-bold shadow-lg shadow-primary/20 text-sm"
                >
                  Create Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
