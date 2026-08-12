import React, { useState, useEffect } from 'react';
import { FullRepoAnalysis, RateLimitStatus } from './types';
import { SAMPLE_REPOS } from './data/mockSampleRepos';
import { Navbar } from './components/Navbar';
import { ModuleTabsNav, ModuleTabId } from './components/ModuleTabsNav';
import { RepoSelectorModal } from './components/RepoSelectorModal';
import { RateLimitModal } from './components/RateLimitModal';

import { DashboardModule } from './components/modules/DashboardModule';
import { RepositoryModule } from './components/modules/RepositoryModule';
import { CodeAnalysisModule } from './components/modules/CodeAnalysisModule';
import { CommitAnalyticsModule } from './components/modules/CommitAnalyticsModule';
import { ContributorAnalyticsModule } from './components/modules/ContributorAnalyticsModule';
import { BranchModule } from './components/modules/BranchModule';
import { PullRequestModule } from './components/modules/PullRequestModule';
import { IssueModule } from './components/modules/IssueModule';
import { ReleaseModule } from './components/modules/ReleaseModule';
import { SecurityModule } from './components/modules/SecurityModule';
import { DependencyModule } from './components/modules/DependencyModule';
import { CicdModule } from './components/modules/CicdModule';
import { PerformanceModule } from './components/modules/PerformanceModule';
import { DocumentationModule } from './components/modules/DocumentationModule';
import { AiInsightsModule } from './components/modules/AiInsightsModule';
import { AiChatModule } from './components/modules/AiChatModule';
import { CompareModule } from './components/modules/CompareModule';
import { ReportsExportModule } from './components/modules/ReportsExportModule';
import { AdminLogsModule } from './components/modules/AdminLogsModule';

import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentOwner, setCurrentOwner] = useState('facebook');
  const [currentRepo, setCurrentRepo] = useState('react');
  const [repoData, setRepoData] = useState<FullRepoAnalysis | null>(SAMPLE_REPOS['facebook/react']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ModuleTabId>('dashboard');
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(true);
  const [customToken, setCustomToken] = useState(() => localStorage.getItem('github_pat') || '');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fav_repos') || '["facebook/react", "vercel/next.js"]');
    } catch {
      return ['facebook/react', 'vercel/next.js'];
    }
  });

  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);

  // Save token changes
  const handleSaveToken = (newToken: string) => {
    setCustomToken(newToken);
    localStorage.setItem('github_pat', newToken);
    fetchRateLimitStatus();
  };

  // Toggle favorite
  const fullRepoName = `${currentOwner}/${currentRepo}`;
  const isFavorite = favorites.includes(fullRepoName);

  const handleToggleFavorite = () => {
    let updated: string[];
    if (isFavorite) {
      updated = favorites.filter((f) => f !== fullRepoName);
    } else {
      updated = [...favorites, fullRepoName];
    }
    setFavorites(updated);
    localStorage.setItem('fav_repos', JSON.stringify(updated));
  };

  // Fetch Rate Limit Status
  const fetchRateLimitStatus = async () => {
    try {
      const res = await fetch('/api/github/rate-limit', {
        headers: customToken ? { Authorization: `token ${customToken}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.rateLimit) {
        setRateLimit(data.rateLimit);
      }
    } catch {
      // Ignore background check failure
    }
  };

  // Main Data Fetcher
  const loadRepoData = async (owner: string, repo: string) => {
    setIsLoading(true);
    setError(null);

    // Fallback to offline mock if preset match or network fails
    const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
    const mockPreset = SAMPLE_REPOS[key];

    try {
      const url = `/api/github/repo?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
      const res = await fetch(url, {
        headers: customToken ? { Authorization: `token ${customToken}` } : {},
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setRepoData(json.data);
      } else if (mockPreset) {
        // Fallback to pre-compiled offline data if available
        setRepoData(mockPreset);
      } else {
        setError(json.error || `Failed to analyze ${owner}/${repo}`);
        if (mockPreset) setRepoData(mockPreset);
      }
    } catch (err) {
      if (mockPreset) {
        setRepoData(mockPreset);
      } else {
        setError(`Unable to connect to server to analyze ${owner}/${repo}`);
      }
    } finally {
      setIsLoading(false);
      fetchRateLimitStatus();
    }
  };

  useEffect(() => {
    loadRepoData(currentOwner, currentRepo);
  }, [currentOwner, currentRepo]);

  const handleSelectRepo = (owner: string, repo: string) => {
    setCurrentOwner(owner);
    setCurrentRepo(repo);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200 flex flex-col`}>
      
      {/* Navbar Header */}
      <Navbar
        currentRepoFullName={fullRepoName}
        onSelectRepo={handleSelectRepo}
        onOpenRepoModal={() => setIsRepoModalOpen(true)}
        onOpenRateLimitModal={() => setIsRateLimitModalOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        rateLimit={rateLimit}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        isLoading={isLoading}
        onRefreshData={() => loadRepoData(currentOwner, currentRepo)}
      />

      {/* Module Horizontal Tab Bar */}
      <ModuleTabsNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      {/* Main Active Module Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <div className="font-bold text-sm text-slate-300">Analyzing {fullRepoName}...</div>
            <p className="text-xs text-slate-500">Fetching GitHub metrics, commits, and running Gemini AI code audit...</p>
          </div>
        )}

        {/* Error Banner if any */}
        {!isLoading && error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadRepoData(currentOwner, currentRepo)}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Active Module Content */}
        {!isLoading && repoData && (
          <>
            {activeTab === 'dashboard' && <DashboardModule data={repoData} onNavigateTab={setActiveTab} />}
            {activeTab === 'repository' && <RepositoryModule info={repoData.info} />}
            {activeTab === 'code' && <CodeAnalysisModule metrics={repoData.code} />}
            {activeTab === 'commits' && <CommitAnalyticsModule commits={repoData.commits} />}
            {activeTab === 'contributors' && <ContributorAnalyticsModule contributors={repoData.contributors} />}
            {activeTab === 'branches' && <BranchModule branches={repoData.branches} />}
            {activeTab === 'prs' && <PullRequestModule prs={repoData.prs} />}
            {activeTab === 'issues' && <IssueModule issues={repoData.issues} />}
            {activeTab === 'releases' && <ReleaseModule releases={repoData.releases} />}
            {activeTab === 'security' && <SecurityModule security={repoData.security} />}
            {activeTab === 'dependencies' && <DependencyModule dependencies={repoData.dependencies} />}
            {activeTab === 'cicd' && <CicdModule cicd={repoData.cicd} />}
            {activeTab === 'performance' && <PerformanceModule performance={repoData.performance} />}
            {activeTab === 'documentation' && <DocumentationModule doc={repoData.documentation} />}
            {activeTab === 'ai-insights' && <AiInsightsModule insights={repoData.aiInsights} />}
            {activeTab === 'ai-chat' && <AiChatModule repoFullName={fullRepoName} />}
            {activeTab === 'compare' && <CompareModule currentData={repoData} />}
            {activeTab === 'export' && <ReportsExportModule data={repoData} />}
            {activeTab === 'admin' && <AdminLogsModule />}
          </>
        )}
      </main>

      {/* Modals */}
      <RepoSelectorModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        onSelectRepo={handleSelectRepo}
        customToken={customToken}
        onSaveToken={handleSaveToken}
        favorites={favorites}
      />

      <RateLimitModal
        isOpen={isRateLimitModalOpen}
        onClose={() => setIsRateLimitModalOpen(false)}
        rateLimit={rateLimit}
        onRefresh={fetchRateLimitStatus}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OctoPulse AI • Powered by Gemini 2.5 Flash & GitHub REST API</span>
          <span className="font-mono">Active Repo: {fullRepoName}</span>
        </div>
      </footer>
    </div>
  );
}
