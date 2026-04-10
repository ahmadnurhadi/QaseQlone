import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TestResult, TestCase } from '../types';
import { GoogleGenAI } from '@google/genai';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Brain, Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import Markdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const Analytics: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const unsubResults = onSnapshot(collection(db, 'projects'), (projSnap) => {
      // This is a bit complex because of nested collections in Firestore IR
      // For simplicity in this demo, we'll fetch all results from all projects
      // In a real app, you'd scope this to a specific project
      projSnap.docs.forEach(async (pDoc) => {
        const resSnap = await getDocs(collection(db, `projects/${pDoc.id}/results`));
        const resData = resSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestResult));
        setResults(prev => [...prev, ...resData]);

        const caseSnap = await getDocs(collection(db, `projects/${pDoc.id}/cases`));
        const caseData = caseSnap.docs.map(d => ({ id: d.id, ...d.data() } as TestCase));
        setCases(prev => [...prev, ...caseData]);
      });
    });
    return unsubResults;
  }, []);

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `
        Analyze the following test execution data and provide a summary of trends, potential risks, and recommendations for the QA team.
        
        Test Cases: ${JSON.stringify(cases.map(c => ({ title: c.title, priority: c.priority })))}
        Test Results: ${JSON.stringify(results.map(r => ({ status: r.status, comment: r.comment })))}
        
        Format the output in Markdown with sections for:
        1. Executive Summary
        2. Failure Patterns (if any)
        3. Risk Assessment
        4. Recommendations
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAnalysis(response.text || 'Failed to generate analysis.');
    } catch (error) {
      console.error('AI Analysis error:', error);
      setAnalysis('Error generating AI analysis. Please check your API key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stats = {
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    blocked: results.filter(r => r.status === 'blocked').length,
  };

  const pieData = [
    { name: 'Passed', value: stats.passed, color: '#22c55e' },
    { name: 'Failed', value: stats.failed, color: '#ef4444' },
    { name: 'Skipped', value: stats.skipped, color: '#94a3b8' },
    { name: 'Blocked', value: stats.blocked, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics & AI Insights</h2>
        <p className="text-slate-500">Data-driven testing intelligence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats Overview */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Execution Summary
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs font-medium text-slate-600">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary text-white rounded-xl p-6 shadow-lg shadow-primary/20 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold">AI Insights</h3>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Let Gemini analyze your test results to find hidden patterns and suggest optimizations.
            </p>
            <button 
              onClick={runAIAnalysis}
              disabled={isAnalyzing || results.length === 0}
              className="w-full bg-white text-primary py-2 rounded-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {isAnalyzing ? 'Analyzing...' : 'Generate AI Report'}
            </button>
          </div>
        </div>

        {/* AI Report / Details */}
        <div className="lg:col-span-2 space-y-6">
          {analysis ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm prose prose-slate max-w-none">
              <div className="flex items-center justify-between mb-6 not-prose">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  AI Analysis Report
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold uppercase tracking-widest">Generated by Gemini</span>
              </div>
              <Markdown>{analysis}</Markdown>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 h-full">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <Brain className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">No Analysis Generated</h4>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Run a few test runs first, then click "Generate AI Report" to get insights.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
