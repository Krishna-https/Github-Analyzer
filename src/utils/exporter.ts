import { FullRepoAnalysis } from '../types';

export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(data: FullRepoAnalysis) {
  const csvRows = [
    ['Metric', 'Value'],
    ['Repository Name', data.info.fullName],
    ['Stars', data.info.stars],
    ['Forks', data.info.forks],
    ['Watchers', data.info.watchers],
    ['Open Issues', data.info.openIssuesCount],
    ['Overall Health Score', `${data.health.overall}/100`],
    ['Code Quality Score', `${data.health.codeQuality}/100`],
    ['Security Score', `${data.health.security}/100`],
    ['Maintainability Score', `${data.health.maintainability}/100`],
    ['Total Files', data.code.totalFiles],
    ['Total Lines of Code', data.code.totalLoc],
    ['Primary Language', data.code.languages[0]?.name || 'N/A'],
    ['Total Commits', data.commits.totalCommits],
    ['Total PRs', data.prs.total],
    ['Merged PRs', data.prs.merged],
    ['AI Rating', data.aiInsights.aiRating],
  ];

  const csvContent = csvRows.map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.info.name}-analysis.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMarkdownReport(data: FullRepoAnalysis) {
  const md = `# OctoPulse AI Analysis Report: ${data.info.fullName}

Generated on: ${new Date().toLocaleDateString()}
AI Rating: **${data.aiInsights.aiRating}** (Health Score: ${data.health.overall}/100)

## 📊 Executive Summary
${data.aiInsights.repositorySummary}

## 🚀 Key Repository Metrics
- **Stars**: ${data.info.stars.toLocaleString()}
- **Forks**: ${data.info.forks.toLocaleString()}
- **Watchers**: ${data.info.watchers.toLocaleString()}
- **Open Issues**: ${data.info.openIssuesCount.toLocaleString()}
- **License**: ${data.info.license}
- **Primary Language**: ${data.code.languages[0]?.name || 'N/A'} (${data.code.languages[0]?.percentage || 0}%)

## 🛠️ Code Metrics
- **Total Files**: ${data.code.totalFiles}
- **Total Lines of Code**: ${data.code.totalLoc.toLocaleString()}
- **Code Lines**: ${data.code.codeLines.toLocaleString()}
- **Comment Lines**: ${data.code.commentLines.toLocaleString()}
- **Maintainability Index**: ${data.code.maintainabilityIndex}/100
- **Test Coverage**: ${data.code.testCoveragePct}%

## 🔒 Security & Vulnerabilities
- **Security Score**: ${data.security.securityScore}/100
- **Secrets Detected**: ${data.security.secretsDetectedCount}
- **Vulnerabilities Count**: ${data.security.vulnerabilities.length}

## 🤖 AI Architectural Insights
${data.aiInsights.architectureExplanation}

### Best Practices & Recommendations
${data.aiInsights.bestPracticesAnalysis.map(b => `- ${b}`).join('\n')}

### Refactoring Suggestions
${data.aiInsights.refactoringSuggestions.map(r => `- ${r}`).join('\n')}

---
*Report exported by OctoPulse AI Hub*
`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.info.name}-report.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printPDFReport() {
  window.print();
}
