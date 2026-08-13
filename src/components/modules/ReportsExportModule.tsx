import React from 'react';
import { FullRepoAnalysis } from '../../types';
import { downloadJSON, downloadCSV, downloadMarkdownReport, printPDFReport } from '../../utils/exporter';
import { FileSpreadsheet, FileText, Download, Printer, FileCode, CheckCircle2, Sparkles } from 'lucide-react';

interface ReportsExportModuleProps {
  data: FullRepoAnalysis;
}

export const ReportsExportModule: React.FC<ReportsExportModuleProps> = ({ data }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <span>Reports & Multi-Format Data Export</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Export full analytical data for {data.info.fullName} to PDF, CSV/Excel, JSON, or Markdown formats.
          </p>
        </div>

        <button
          onClick={printPDFReport}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all flex-shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save as PDF Report</span>
        </button>
      </div>

      {/* Export Format Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* PDF Print */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">PDF Executive Report</h3>
            <p className="text-xs text-slate-400">Printable formatted layout with charts and AI audit summary.</p>
          </div>
          <button
            onClick={printPDFReport}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Generate PDF
          </button>
        </div>

        {/* CSV / Excel */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">CSV / Excel Spreadsheet</h3>
            <p className="text-xs text-slate-400">Raw metric rows compatible with Excel, Google Sheets, or PowerBI.</p>
          </div>
          <button
            onClick={() => downloadCSV(data)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Download CSV
          </button>
        </div>

        {/* JSON Dump */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 w-fit">
              <FileCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">Full JSON Data Dump</h3>
            <p className="text-xs text-slate-400">Complete structured schema of all 23 analysis modules.</p>
          </div>
          <button
            onClick={() => downloadJSON(data, `${data.info.name}-full-data`)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Download JSON
          </button>
        </div>

        {/* Markdown */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">Markdown Document</h3>
            <p className="text-xs text-slate-400">Clean GitHub Markdown report for wiki, PR, or docs.</p>
          </div>
          <button
            onClick={() => downloadMarkdownReport(data)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Download Markdown
          </button>
        </div>

      </div>

    </div>
  );
};
