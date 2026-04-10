import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Project, TestSuite, TestCase, TestRun } from '../types';
import { Plus, FolderPlus, FileText, ChevronRight, ChevronDown, MoreHorizontal, Layers, Play, History, Sparkles, Loader2, Wand2, Check, X, Save } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'repository' | 'runs' | 'integrations'>('repository');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [featureDescription, setFeatureDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCases, setGeneratedCases] = useState<Partial<TestCase>[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    
    const projectRef = doc(db, 'projects', projectId);
    getDoc(projectRef).then(snap => {
      if (snap.exists()) setProject({ id: snap.id, ...snap.data() } as Project);
    });

    const suitesQuery = query(collection(db, `projects/${projectId}/suites`));
    const casesQuery = query(collection(db, `projects/${projectId}/cases`));
    const runsQuery = query(collection(db, `projects/${projectId}/runs`), orderBy('createdAt', 'desc'));

    const unsubSuites = onSnapshot(suitesQuery, (snap) => {
      setSuites(snap.docs.map(d => ({ id: d.id, ...d.data() } as TestSuite)));
    });

    const unsubCases = onSnapshot(casesQuery, (snap) => {
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as TestCase)));
    });

    const unsubRuns = onSnapshot(runsQuery, (snap) => {
      setRuns(snap.docs.map(d => ({ id: d.id, ...d.data() } as TestRun)));
    });

    return () => { unsubSuites(); unsubCases(); unsubRuns(); };
  }, [projectId]);

  const toggleSuite = (id: string) => {
    setExpandedSuites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addSuite = async () => {
    if (!projectId) return;
    const title = prompt('Enter suite title:');
    if (!title) return;
    await addDoc(collection(db, `projects/${projectId}/suites`), {
      title,
      projectId,
      createdAt: serverTimestamp()
    });
  };

  const addCase = async (suiteId?: string) => {
    if (!projectId) return;
    const title = prompt('Enter test case title:');
    if (!title) return;
    await addDoc(collection(db, `projects/${projectId}/cases`), {
      title,
      projectId,
      suiteId: suiteId || null,
      steps: [],
      priority: 'medium',
      status: 'actual',
      createdAt: serverTimestamp()
    });
  };

  const startNewRun = async () => {
    if (!projectId) return;
    const title = prompt('Enter test run title:', `Run - ${new Date().toLocaleDateString()}`);
    if (!title) return;
    
    const docRef = await addDoc(collection(db, `projects/${projectId}/runs`), {
      title,
      projectId,
      status: 'active',
      createdAt: serverTimestamp()
    });
    navigate(`/projects/${projectId}/runs/${docRef.id}`);
  };

  const generateAICases = async () => {
    if (!featureDescription.trim()) return;
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a list of comprehensive test cases for the following feature description or user story: "${featureDescription}". 
        Return the result as a JSON array of objects, where each object has: title, description, steps (array of strings), expectedResult, and priority (low, medium, high, or critical).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                expectedResult: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] }
              },
              required: ['title', 'steps', 'expectedResult', 'priority']
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      setGeneratedCases(data);
    } catch (error) {
      console.error('AI Generation error:', error);
      alert('Failed to generate test cases. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGeneratedCases = async () => {
    if (!projectId || generatedCases.length === 0) return;
    try {
      const batch = generatedCases.map(c => 
        addDoc(collection(db, `projects/${projectId}/cases`), {
          ...c,
          projectId,
          suiteId: selectedSuiteId || null,
          status: 'actual',
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(batch);
      setIsAIModalOpen(false);
      setGeneratedCases([]);
      setFeatureDescription('');
    } catch (error) {
      console.error('Error saving AI cases:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Repository Sidebar */}
      <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Repository
          </h3>
          <div className="flex gap-1">
            <button 
              onClick={() => setIsAIModalOpen(true)}
              className="p-1.5 hover:bg-primary/10 rounded text-primary" 
              title="Generate with AI"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button onClick={addSuite} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="New Suite">
              <FolderPlus className="w-4 h-4" />
            </button>
            <button onClick={() => addCase()} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="New Case">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-2 space-y-1">
          {suites.map(suite => (
            <div key={suite.id} className="space-y-1">
              <div 
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer group"
                onClick={() => toggleSuite(suite.id)}
              >
                {expandedSuites[suite.id] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <span className="text-sm font-medium text-slate-700 flex-1 truncate">{suite.title}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); addCase(suite.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              
              {expandedSuites[suite.id] && (
                <div className="ml-6 space-y-1 border-l border-slate-100 pl-2">
                  {cases.filter(c => c.suiteId === suite.id).map(c => (
                    <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer text-sm text-slate-600">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{c.title}</span>
                    </div>
                  ))}
                  {cases.filter(c => c.suiteId === suite.id).length === 0 && (
                    <span className="text-[10px] text-slate-400 italic px-2">No cases yet</span>
                  )}
                </div>
              )}
            </div>
          ))}
          
          <div className="pt-4 px-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Unsorted Cases</h4>
            {cases.filter(c => !c.suiteId).map(c => (
              <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer text-sm text-slate-600">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{c.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-50 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{project?.name}</h2>
              <div className="flex gap-2">
                <button onClick={startNewRun} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start Test Run
                </button>
              </div>
            </div>
            <p className="text-slate-600 mb-8">{project?.description}</p>
            
            <div className="flex border-b border-slate-200 mb-6">
              <button 
                onClick={() => setActiveTab('repository')}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-all",
                  activeTab === 'repository' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                Repository
              </button>
              <button 
                onClick={() => setActiveTab('runs')}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-all",
                  activeTab === 'runs' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                Test Runs
              </button>
              <button 
                onClick={() => setActiveTab('integrations')}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-all",
                  activeTab === 'integrations' ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                Integrations
              </button>
            </div>

            {activeTab === 'repository' ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Cases</p>
                  <p className="text-2xl font-bold text-slate-900">{cases.length}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Suites</p>
                  <p className="text-2xl font-bold text-slate-900">{suites.length}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Runs</p>
                  <p className="text-2xl font-bold text-slate-900">{runs.filter(r => r.status === 'active').length}</p>
                </div>
              </div>
            ) : activeTab === 'runs' ? (
              <div className="space-y-4">
                {runs.map(run => (
                  <Link 
                    key={run.id} 
                    to={`/projects/${projectId}/runs/${run.id}`}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg hover:border-primary transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-full",
                        run.status === 'active' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                      )}>
                        {run.status === 'active' ? <Play className="w-4 h-4" /> : <History className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors">{run.title}</h4>
                        <p className="text-xs text-slate-500">Created {run.createdAt ? formatDate(run.createdAt.toDate()) : 'just now'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                        run.status === 'active' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                      )}>
                        {run.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
                {runs.length === 0 && (
                  <div className="text-center py-12 text-slate-400 italic">No test runs yet.</div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <img src="https://github.com/favicon.ico" className="w-5 h-5" alt="GitHub" />
                    <h4 className="font-bold text-slate-900">GitHub Webhook</h4>
                  </div>
                  <p className="text-sm text-slate-600">
                    Send test results from your GitHub Actions directly to QaseClone.
                  </p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Webhook URL</label>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={`${window.location.origin}/api/webhooks/github?projectId=${projectId}`}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono text-slate-500 outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/github?projectId=${projectId}`);
                          alert('Copied to clipboard!');
                        }}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300 transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <img src="https://gitlab.com/favicon.ico" className="w-5 h-5" alt="GitLab" />
                    <h4 className="font-bold text-slate-900">GitLab Webhook</h4>
                  </div>
                  <p className="text-sm text-slate-600">
                    Integrate your GitLab CI/CD pipelines with QaseClone.
                  </p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Webhook URL</label>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={`${window.location.origin}/api/webhooks/gitlab?projectId=${projectId}`}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-mono text-slate-500 outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/gitlab?projectId=${projectId}`);
                          alert('Copied to clipboard!');
                        }}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300 transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'repository' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Recent Test Cases</h3>
                <button className="text-xs text-primary font-medium hover:underline">View all</button>
              </div>
              <div className="divide-y divide-slate-100">
                {cases.slice(0, 5).map(c => (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        c.priority === 'critical' ? 'bg-red-500' : 
                        c.priority === 'high' ? 'bg-orange-500' : 
                        c.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                      )} />
                      <span className="text-sm font-medium text-slate-700">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">{c.status}</span>
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {cases.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic">No test cases found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Generator Modal */}
      {isAIModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">AI Test Case Generator</h3>
              </div>
              <button onClick={() => setIsAIModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Feature Description / User Story</label>
                <textarea 
                  value={featureDescription}
                  onChange={e => setFeatureDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-32 resize-none text-sm"
                  placeholder="Describe the feature you want to test (e.g. 'As a user, I want to be able to reset my password via email...')"
                />
                <button 
                  onClick={generateAICases}
                  disabled={isGenerating || !featureDescription.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  {isGenerating ? 'Generating Cases...' : 'Generate Test Cases'}
                </button>
              </div>

              {generatedCases.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">Generated Cases ({generatedCases.length})</h4>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-500">Target Suite:</label>
                      <select 
                        value={selectedSuiteId || ''} 
                        onChange={e => setSelectedSuiteId(e.target.value || null)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-primary"
                      >
                        <option value="">Unsorted</option>
                        {suites.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {generatedCases.map((c, i) => (
                      <div key={i} className="p-4 border border-slate-100 bg-slate-50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-800 text-sm">{c.title}</h5>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                            c.priority === 'critical' ? 'bg-red-100 text-red-600' : 
                            c.priority === 'high' ? 'bg-orange-100 text-orange-600' : 
                            'bg-blue-100 text-blue-600'
                          )}>
                            {c.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{c.description}</p>
                        <div className="flex items-center gap-4 pt-2">
                          <span className="text-[10px] text-slate-400 font-medium">{c.steps?.length} steps</span>
                          <span className="text-[10px] text-slate-400 font-medium">Expected: {c.expectedResult?.substring(0, 30)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsAIModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-white transition-colors font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={saveGeneratedCases}
                disabled={generatedCases.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save to Repository
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
