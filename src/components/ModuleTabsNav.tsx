import React from 'react';
import {
  LayoutDashboard,
  FileCode2,
  GitCommitHorizontal,
  Users,
  GitBranch,
  GitPullRequest,
  AlertCircle,
  Tag,
  ShieldCheck,
  Package,
  Workflow,
  Zap,
  BookOpen,
  Sparkles,
  MessageSquareCode,
  GitCompare,
  FileSpreadsheet,
  SlidersHorizontal,
  Info
} from 'lucide-react';

export type ModuleTabId =
  | 'dashboard'
  | 'repository'
  | 'code'
  | 'commits'
  | 'contributors'
  | 'branches'
  | 'prs'
  | 'issues'
  | 'releases'
  | 'security'
  | 'dependencies'
  | 'cicd'
  | 'performance'
  | 'documentation'
  | 'ai-insights'
  | 'ai-chat'
  | 'compare'
  | 'export'
  | 'admin';

interface ModuleTabsNavProps {
  activeTab: ModuleTabId;
  onTabChange: (tab: ModuleTabId) => void;
}

export const MODULE_TABS: { id: ModuleTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'repository', label: 'Repository', icon: Info },
  { id: 'code', label: 'Code Analysis', icon: FileCode2 },
  { id: 'commits', label: 'Commit Analytics', icon: GitCommitHorizontal },
  { id: 'contributors', label: 'Contributors', icon: Users },
  { id: 'branches', label: 'Branches', icon: GitBranch },
  { id: 'prs', label: 'Pull Requests', icon: GitPullRequest },
  { id: 'issues', label: 'Issues', icon: AlertCircle },
  { id: 'releases', label: 'Releases', icon: Tag },
  { id: 'security', label: 'Security & CVEs', icon: ShieldCheck },
  { id: 'dependencies', label: 'Dependencies', icon: Package },
  { id: 'cicd', label: 'CI/CD Pipelines', icon: Workflow },
  { id: 'performance', label: 'Performance', icon: Zap },
  { id: 'documentation', label: 'Documentation', icon: BookOpen },
  { id: 'ai-insights', label: 'AI Insights', icon: Sparkles },
  { id: 'ai-chat', label: 'AI Chat & Review', icon: MessageSquareCode },
  { id: 'compare', label: 'Compare Repos', icon: GitCompare },
  { id: 'export', label: 'Export & Reports', icon: FileSpreadsheet },
  { id: 'admin', label: 'Admin & Logs', icon: SlidersHorizontal },
];

export const ModuleTabsNav: React.FC<ModuleTabsNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-slate-900/80 border-b border-slate-800 sticky top-16 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2.5 no-scrollbar scroll-smooth">
          {MODULE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
