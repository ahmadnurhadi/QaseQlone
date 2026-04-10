import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { TestCase, TestRun, TestResult } from '../types';
import { CheckCircle2, XCircle, SkipForward, AlertCircle, Play, Save, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export const TestRunExecution: React.FC = () => {
  const { projectId, runId } = useParams<{ projectId: string; runId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [run, setRun] = useState<TestRun | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!projectId || !runId) return;

    const runRef = doc(db, `projects/${projectId}/runs`, runId);
    getDoc(runRef).then(snap => {
      if (snap.exists()) setRun({ id: snap.id, ...snap.data() } as TestRun);
    });

    const casesQuery = query(collection(db, `projects/${projectId}/cases`));
    onSnapshot(casesQuery, (snap) => {
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as TestCase)));
    });

    const resultsQuery = query(collection(db, `projects/${projectId}/results`), where('testRunId', '==', runId));
    onSnapshot(resultsQuery, (snap) => {
      const resMap: Record<string, TestResult> = {};
      snap.docs.forEach(d => {
        const data = d.data() as TestResult;
        resMap[data.testCaseId] = { id: d.id, ...data };
      });
      setResults(resMap);
    });
  }, [projectId, runId]);

  const currentCase = cases[currentCaseIndex];

  const submitResult = async (status: TestResult['status']) => {
    if (!projectId || !runId || !currentCase || !user) return;

    const resultData = {
      testCaseId: currentCase.id,
      testRunId: runId,
      status,
      comment,
      executedAt: serverTimestamp(),
      executedBy: user.displayName || user.email,
      duration: 0, // Simplified
    };

    try {
      if (results[currentCase.id]) {
        await updateDoc(doc(db, `projects/${projectId}/results`, results[currentCase.id].id), resultData);
      } else {
        await addDoc(collection(db, `projects/${projectId}/results`), resultData);
      }
      
      setComment('');
      if (currentCaseIndex < cases.length - 1) {
        setCurrentCaseIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error saving result:', error);
    }
  };

  const completeRun = async () => {
    if (!projectId || !runId) return;
    await updateDoc(doc(db, `projects/${projectId}/runs`, runId), {
      status: 'completed',
      completedAt: serverTimestamp()
    });
    navigate(`/projects/${projectId}`);
  };

  if (!currentCase) return <div className="p-8">Loading cases...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{run?.title}</h2>
            <p className="text-slate-500">Executing test run</p>
          </div>
        </div>
        <button 
          onClick={completeRun}
          className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          Complete Run
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Case List Sidebar */}
        <div className="col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-fit sticky top-24">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm">Test Cases ({cases.length})</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {cases.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setCurrentCaseIndex(i)}
                className={cn(
                  "w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left",
                  currentCaseIndex === i && "bg-primary/5 border-l-4 border-primary"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-slate-400 w-4">{i + 1}</span>
                  <span className={cn("text-sm font-medium truncate", currentCaseIndex === i ? "text-primary" : "text-slate-700")}>
                    {c.title}
                  </span>
                </div>
                {results[c.id] && (
                  results[c.id].status === 'passed' ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> :
                  results[c.id].status === 'failed' ? <XCircle className="w-4 h-4 text-red-500 shrink-0" /> :
                  <SkipForward className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Execution Area */}
        <div className="col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
                Case {currentCaseIndex + 1} of {cases.length}
              </span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                  currentCase.priority === 'critical' ? 'bg-red-100 text-red-600' : 
                  currentCase.priority === 'high' ? 'bg-orange-100 text-orange-600' : 
                  'bg-slate-100 text-slate-600'
                )}>
                  {currentCase.priority}
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-900">{currentCase.title}</h3>
            
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">Description</h4>
              <p className="text-slate-600 text-sm">{currentCase.description || 'No description provided.'}</p>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">Steps</h4>
              <div className="space-y-2">
                {currentCase.steps.length > 0 ? currentCase.steps.map((step, i) => (
                  <div key={i} className="flex gap-3 text-sm text-slate-600 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-400">{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                )) : (
                  <p className="text-slate-400 italic text-sm">No steps defined.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm">Expected Result</h4>
              <div className="p-4 bg-green-50/50 border border-green-100 rounded-lg text-sm text-slate-700">
                {currentCase.expectedResult || 'No expected result defined.'}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Comment / Actual Result</label>
                <textarea 
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-24 resize-none text-sm"
                  placeholder="Describe what actually happened..."
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => submitResult('passed')}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Pass
                </button>
                <button 
                  onClick={() => submitResult('failed')}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  <XCircle className="w-5 h-5" />
                  Fail
                </button>
                <button 
                  onClick={() => submitResult('skipped')}
                  className="px-6 flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  <SkipForward className="w-5 h-5" />
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
