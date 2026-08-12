import React, { useState } from 'react';
import { MessageSquareCode, Send, Sparkles, FileCode2, BookOpen, User, Bot, Loader2, Copy, Check } from 'lucide-react';

interface AiChatModuleProps {
  repoFullName: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const AiChatModule: React.FC<AiChatModuleProps> = ({ repoFullName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Hello! I am your AI Repository Assistant for **${repoFullName}**. Ask me anything about this repository's codebase, architecture, setup instructions, security, or pull requests!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Tab mode: Chat vs Code Review vs Doc Generator
  const [subMode, setSubMode] = useState<'chat' | 'review' | 'docs'>('chat');

  // Code Review state
  const [codeSnippet, setCodeSnippet] = useState('');
  const [reviewResult, setReviewResult] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Doc Generator state
  const [docModule, setDocModule] = useState('');
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  const [copied, setCopied] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMsg;
    if (!query.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputMsg('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoFullName,
          message: query,
          history: messages.map((m) => ({ role: m.sender === 'user' ? 'user' : 'model', content: m.text })),
        }),
      });

      const data = await res.json();
      const aiReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply || 'Sorry, I was unable to generate a response.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Error connecting to Gemini AI assistant. Please check your network or try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCodeReview = async () => {
    if (!codeSnippet.trim() || isReviewing) return;
    setIsReviewing(true);
    setReviewResult('');

    try {
      const res = await fetch('/api/ai/code-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName, codeSnippet }),
      });
      const data = await res.json();
      setReviewResult(data.review || 'No review generated.');
    } catch (err) {
      setReviewResult('Failed to perform AI code review.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleGenerateDocs = async () => {
    if (isGeneratingDoc) return;
    setIsGeneratingDoc(true);
    setGeneratedDoc('');

    try {
      const res = await fetch('/api/ai/generate-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName, moduleName: docModule || 'Core Application Architecture' }),
      });
      const data = await res.json();
      setGeneratedDoc(data.docs || 'No docs generated.');
    } catch (err) {
      setGeneratedDoc('Failed to generate AI documentation.');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const quickPrompts = [
    'Explain the entry point architecture of this repository.',
    'How do I build and run tests locally for this project?',
    'What are the main third-party dependencies and security concerns?',
    'Where are the primary API routes or data models located?',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Selector Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubMode('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subMode === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquareCode className="w-4 h-4" />
          <span>Interactive AI Chat</span>
        </button>

        <button
          onClick={() => setSubMode('review')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subMode === 'review' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>AI Code & PR Review</span>
        </button>

        <button
          onClick={() => setSubMode('docs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            subMode === 'docs' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Auto Documentation Generator</span>
        </button>
      </div>

      {/* Mode 1: Interactive Chat */}
      {subMode === 'chat' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[600px] shadow-xl">
          
          {/* Quick Prompt Bar */}
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="font-semibold text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Prompts:
            </span>
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(qp)}
                className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap transition-colors flex-shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Chat Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white ${
                    m.sender === 'user' ? 'bg-indigo-600' : 'bg-purple-600'
                  }`}
                >
                  {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none font-mono whitespace-pre-wrap'
                  }`}
                >
                  <div>{m.text}</div>
                  <div
                    className={`text-[10px] mt-1 text-right ${
                      m.sender === 'user' ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gemini AI is analyzing codebase...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={`Ask Gemini about ${repoFullName}...`}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isSending || !inputMsg.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Mode 2: AI Code Review */}
      {subMode === 'review' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md flex flex-col">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-indigo-400" />
              <span>Paste Code Snippet / Diff to Review</span>
            </h3>
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste code or pull request diff here..."
              rows={16}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 resize-none"
            />
            <button
              onClick={handleCodeReview}
              disabled={isReviewing || !codeSnippet.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isReviewing ? 'Analyzing Code...' : 'Run AI Code Review'}</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md flex flex-col">
            <h3 className="font-bold text-sm text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>AI Review & Feedback Output</span>
              </span>
            </h3>
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {reviewResult || 'Paste a snippet on the left and click "Run AI Code Review" to generate feedback on performance, bugs, and best practices.'}
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Auto Documentation Generator */}
      {subMode === 'docs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Generate Comprehensive Technical Documentation</span>
              </h3>
              <p className="text-xs text-slate-400">Generates Markdown architecture guides & API reference</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={docModule}
                onChange={(e) => setDocModule(e.target.value)}
                placeholder="Module name (e.g. Auth or API)..."
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleGenerateDocs}
                disabled={isGeneratingDoc}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                {isGeneratingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-xs font-mono text-slate-200 min-h-[300px] max-h-[500px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {generatedDoc || 'Click "Generate" above to synthesize technical documentation and architectural reference for this module.'}
          </div>
        </div>
      )}

    </div>
  );
};
