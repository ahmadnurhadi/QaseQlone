export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  ownerId: string;
  createdAt: any;
}

export interface TestSuite {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  parentSuiteId?: string;
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  steps: string[];
  expectedResult?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'actual' | 'draft' | 'deprecated';
  suiteId?: string;
  projectId: string;
}

export interface TestRun {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed';
  projectId: string;
  createdAt: any;
  completedAt?: any;
}

export interface TestResult {
  id: string;
  testCaseId: string;
  testRunId: string;
  status: 'passed' | 'failed' | 'skipped' | 'blocked';
  comment?: string;
  duration?: number;
  executedAt: any;
  executedBy: string;
}
