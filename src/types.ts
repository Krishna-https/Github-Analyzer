export interface RepoHealthScore {
  overall: number; // 0 - 100
  codeQuality: number;
  security: number;
  maintainability: number;
  documentation: number;
  communityActivity: number;
  ciStatus: number;
}

export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  avatarUrl: string;
  visibility: 'public' | 'private';
  stars: number;
  forks: number;
  watchers: number;
  openIssuesCount: number;
  sizeKb: number;
  defaultBranch: string;
  license: string;
  homepage: string;
  topics: string[];
  tagsCount: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  isArchived: boolean;
  isFork: boolean;
  isTemplate: boolean;
  ageDays: number;
  popularityScore: number;
}

export interface LanguageDistribution {
  name: string;
  percentage: number;
  bytes: number;
  color: string;
}

export interface FileItem {
  path: string;
  size: number;
  lines: number;
  type: string;
  complexity?: number;
  issuesCount?: number;
}

export interface CodeMetrics {
  totalFiles: number;
  totalFolders: number;
  totalLoc: number;
  blankLines: number;
  commentLines: number;
  codeLines: number;
  languages: LanguageDistribution[];
  largestFiles: FileItem[];
  largestDirectories: { name: string; sizeKb: number; fileCount: number }[];
  fileTypeDistribution: { type: string; count: number; percentage: number }[];
  duplicateFilesCount: number;
  duplicateCodePercentage: number;
  deadCodeSuspects: number;
  todoCount: number;
  fixmeCount: number;
  codeSmellsCount: number;
  avgCyclomaticComplexity: number;
  maintainabilityIndex: number; // 0-100
  technicalDebtHours: number;
  readabilityScore: number;
  documentationCoveragePct: number;
  testCoveragePct: number;
  buildSuccessRatePct: number;
}

export interface CommitData {
  sha: string;
  message: string;
  authorName: string;
  authorAvatar: string;
  date: string;
  additions: number;
  deletions: number;
  filesChanged: number;
}

export interface CommitAnalytics {
  totalCommits: number;
  commitsPerDayAvg: number;
  commitsPerWeekAvg: number;
  commitsPerMonthAvg: number;
  heatmap: { date: string; count: number }[]; // 365 days
  timeline: { month: string; commits: number; additions: number; deletions: number }[];
  activeDays: { day: string; count: number }[];
  activeHours: { hour: number; count: number }[];
  avgCommitSizeLines: number;
  largestCommitLines: number;
  smallestCommitLines: number;
  messageSentiments: { positive: number; neutral: number; negative: number };
  longestInactivePeriodDays: number;
  recentCommits: CommitData[];
}

export interface Contributor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
  additions: number;
  deletions: number;
  commitsCount: number;
  prsCount: number;
  issuesCount: number;
  reviewCount: number;
  isActive: boolean;
  isNew: boolean;
  contributionPct: number;
}

export interface BranchInfo {
  name: string;
  isDefault: boolean;
  isProtected: boolean;
  isStale: boolean;
  lastCommitDate: string;
  lastCommitAuthor: string;
  lastCommitMessage: string;
  aheadCount: number;
  behindCount: number;
}

export interface PullRequestStats {
  total: number;
  open: number;
  closed: number;
  merged: number;
  mergeRatePct: number;
  avgMergeTimeHours: number;
  avgReviewTimeHours: number;
  draftPrsCount: number;
  labelsDistribution: { name: string; count: number; color: string }[];
  reviewerStats: { reviewer: string; reviewsCount: number; avgTimeHours: number }[];
  prSuccessRatePct: number;
}

export interface IssueStats {
  total: number;
  open: number;
  closed: number;
  avgResolutionTimeHours: number;
  highPriorityCount: number;
  bugVsFeatureRatio: { bugs: number; features: number; others: number };
  labelsDistribution: { name: string; count: number; color: string }[];
  assigneeStats: { assignee: string; openCount: number; closedCount: number }[];
}

export interface ReleaseInfo {
  tagName: string;
  name: string;
  publishedAt: string;
  isPrerelease: boolean;
  assetsCount: number;
  downloadCount: number;
  body: string;
}

export interface ReleaseStats {
  totalReleases: number;
  latestRelease?: ReleaseInfo;
  releaseFrequencyPerMonth: number;
  history: { date: string; tag: string; title: string }[];
  changelogSummary: string;
}

export interface VulnerabilityItem {
  id: string;
  package: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  cve?: string;
  recommendation: string;
}

export interface SecurityAnalysis {
  securityScore: number;
  secretsDetectedCount: number;
  apiKeysDetectedCount: number;
  tokensDetectedCount: number;
  sensitiveFiles: string[];
  vulnerabilities: VulnerabilityItem[];
  outdatedPackagesCount: number;
  licenseRisksCount: number;
  licenseWarnings: string[];
}

export interface DependencyItem {
  name: string;
  version: string;
  latestVersion: string;
  isOutdated: boolean;
  isDev: boolean;
  sizeKb: number;
  riskScore: 'low' | 'medium' | 'high';
}

export interface DependencyAnalysis {
  totalPackages: number;
  directDependenciesCount: number;
  devDependenciesCount: number;
  outdatedLibraries: DependencyItem[];
  unusedSuspects: string[];
  duplicateDependencies: string[];
  totalDependencySizeMb: number;
  dependencyRiskScore: number;
  dependencies: DependencyItem[];
}

export interface WorkflowRun {
  id: string;
  name: string;
  status: 'success' | 'failure' | 'cancelled' | 'in_progress';
  event: string;
  durationSeconds: number;
  createdAt: string;
}

export interface CicdAnalysis {
  actionsEnabled: boolean;
  totalWorkflows: number;
  workflowSuccessRatePct: number;
  failedBuildsCount: number;
  deploymentFrequencyPerWeek: number;
  avgBuildDurationSeconds: number;
  recentRuns: WorkflowRun[];
}

export interface PerformanceAnalysis {
  largeFilesList: { path: string; sizeMb: number }[];
  largeCommitsList: { sha: string; author: string; linesChanged: number }[];
  repoGrowthMb: { date: string; sizeMb: number }[];
  cloneSizeMb: number;
  downloadSizeMb: number;
  bottlenecks: string[];
}

export interface DocumentationAnalysis {
  readmeQualityScore: number;
  readmeHasBadge: boolean;
  readmeHasInstallation: boolean;
  readmeHasUsage: boolean;
  readmeHasLicense: boolean;
  wikiAvailable: boolean;
  apiDocumentationScore: number;
  codeCommentDensityPct: number;
  overallDocScore: number;
  suggestions: string[];
}

export interface AiInsights {
  repositorySummary: string;
  architectureExplanation: string;
  codebaseOverview: string;
  bestPracticesScore: number;
  bestPracticesAnalysis: string[];
  bugPredictions: string[];
  refactoringSuggestions: string[];
  performanceSuggestions: string[];
  securitySuggestions: string[];
  documentationSuggestions: string[];
  aiRating: 'S' | 'A' | 'B' | 'C' | 'D';
  aiRatingReasoning: string;
}

export interface FullRepoAnalysis {
  info: RepoInfo;
  health: RepoHealthScore;
  code: CodeMetrics;
  commits: CommitAnalytics;
  contributors: Contributor[];
  branches: BranchInfo[];
  prs: PullRequestStats;
  issues: IssueStats;
  releases: ReleaseStats;
  security: SecurityAnalysis;
  dependencies: DependencyAnalysis;
  cicd: CicdAnalysis;
  performance: PerformanceAnalysis;
  documentation: DocumentationAnalysis;
  aiInsights: AiInsights;
  fetchedAt: string;
  isMockData?: boolean;
}

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetTime: string;
  used: number;
  hasCustomToken: boolean;
}

export interface ActivityFeedItem {
  id: string;
  type: 'commit' | 'pr' | 'issue' | 'release' | 'security';
  title: string;
  author: string;
  avatar: string;
  timestamp: string;
  badgeColor?: string;
}

export interface ComparisonResult {
  repo1: FullRepoAnalysis;
  repo2: FullRepoAnalysis;
  aiVerdict: {
    winner: string;
    reasoning: string;
    keyDifferences: string[];
  };
}

