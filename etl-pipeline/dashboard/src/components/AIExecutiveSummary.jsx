import React, { useState, useEffect, useRef } from 'react';
import { Card, Title, Text, Flex, Badge, TextInput, Button } from '@tremor/react';
import { SparklesIcon, ClockIcon, ChatBubbleLeftRightIcon, ArrowPathIcon, ShareIcon } from '@heroicons/react/24/outline';
import { MessageCircle } from 'lucide-react';
import { askPipeline } from '../services/api';

// Executive summary prompt - hidden from UI, sent automatically on load
const EXECUTIVE_SUMMARY_PROMPT = `Analyze the current pipeline data from the views. Give me a 3-sentence executive summary focusing on:
1. The Pace Delta (are we ahead or behind Q1 target?)
2. The biggest risk in the pipeline (from deal focus scores or contact health)
3. One specific, actionable strategic recommendation

Be direct and data-driven. Use specific numbers.`;

/**
 * AIExecutiveSummary Component
 * Displays AI-generated insights and supports natural language queries
 *
 * Props:
 * - data: AI summary data from ceo_summaries_history (used as fallback)
 * - onQuery: callback for natural language query submission
 * - queryResult: result from AI query
 * - queryLoading: loading state for AI query
 * - dashboardLoaded: boolean indicating if dashboard data has finished loading
 */
const AIExecutiveSummary = ({ data, onQuery, queryResult, queryLoading, dashboardLoaded = false }) => {
  const [queryInput, setQueryInput] = useState('');

  // Auto-generated executive summary state
  const [autoSummary, setAutoSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const hasFetchedRef = useRef(false);

  // Fetch executive summary automatically when dashboard is loaded
  useEffect(() => {
    const fetchExecutiveSummary = async () => {
      // Only fetch once when dashboard data is loaded
      if (!dashboardLoaded || hasFetchedRef.current || summaryLoading) return;

      hasFetchedRef.current = true;
      setSummaryLoading(true);
      setSummaryError(null);

      try {
        console.log('[AIExecutiveSummary] Fetching auto summary from Vertex AI...');
        const result = await askPipeline(EXECUTIVE_SUMMARY_PROMPT);

        if (result.success && result.response) {
          setAutoSummary({
            executive_insight: result.response,
            generated_at: result.generated_at,
            model_version: result.model || 'Gemini 2.0',
            function_calls: result.function_calls,
          });
          console.log('[AIExecutiveSummary] Auto summary loaded successfully');
        } else {
          throw new Error(result.error || 'Failed to generate summary');
        }
      } catch (err) {
        console.error('[AIExecutiveSummary] Error fetching auto summary:', err);
        setSummaryError(err.message);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchExecutiveSummary();
  }, [dashboardLoaded]);

  // Regenerate summary handler
  const handleRegenerateSummary = async () => {
    hasFetchedRef.current = false;
    setAutoSummary(null);
    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const result = await askPipeline(EXECUTIVE_SUMMARY_PROMPT);

      if (result.success && result.response) {
        setAutoSummary({
          executive_insight: result.response,
          generated_at: result.generated_at,
          model_version: result.model || 'Gemini 2.0',
          function_calls: result.function_calls,
        });
      } else {
        throw new Error(result.error || 'Failed to regenerate summary');
      }
    } catch (err) {
      console.error('[AIExecutiveSummary] Error regenerating summary:', err);
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
      hasFetchedRef.current = true;
    }
  };

  // Example queries for users
  const exampleQueries = [
    'Are we on track for Q1 targets?',
    'Which deals are most at risk?',
    'Why are we behind on goals?',
  ];

  // Handle query submission
  const handleQuerySubmit = () => {
    if (queryInput.trim() && onQuery) {
      onQuery(queryInput.trim());
    }
  };

  // Handle example query click
  const handleExampleClick = (query) => {
    setQueryInput(query);
    if (onQuery) {
      onQuery(query);
    }
  };

  // Parse markdown-style formatting to JSX
  const formatInsight = (text) => {
    if (!text) return null;

    // Split by double newlines to get paragraphs
    const paragraphs = text.split('\n\n');

    return paragraphs.map((para, idx) => {
      // Check if it's a list item
      if (para.trim().startsWith('-') || para.match(/^\d+\./)) {
        const items = para.split('\n').filter(item => item.trim());
        return (
          <ul key={idx} className="list-disc list-inside space-y-1 my-2 ml-4">
            {items.map((item, itemIdx) => {
              const cleanItem = item.replace(/^[-\d.]+\s*/, '');
              return (
                <li key={itemIdx} className="text-gray-700">
                  {formatBoldText(cleanItem)}
                </li>
              );
            })}
          </ul>
        );
      }

      // Regular paragraph with bold formatting
      return (
        <p key={idx} className="text-gray-700 my-2">
          {formatBoldText(para)}
        </p>
      );
    });
  };

  // Convert **text** to bold
  const formatBoldText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Format timestamp
  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Determine which summary data to use (priority: autoSummary > data prop > fallback)
  const summaryData = autoSummary || data || {
    executive_insight: null,
    generated_at: new Date().toISOString(),
    model_version: 'Gemini 2.0',
    confidence_score: null,
  };

  // Share to WhatsApp - formats AI insight for strategic sharing
  const handleWhatsAppShare = () => {
    const insight = summaryData?.executive_insight || '';

    if (!insight || summaryLoading) {
      alert('Please wait for the AI summary to load before sharing.');
      return;
    }

    // Extract key information from the AI insight
    const lines = insight.split('\n').filter(line => line.trim());

    // Build a concise summary (first 2-3 meaningful lines)
    const summaryLines = lines.slice(0, 3).join('\n');

    // Extract any recommendations (lines starting with - or numbers)
    const recommendations = lines
      .filter(line => line.trim().startsWith('-') || /^\d+\./.test(line.trim()))
      .slice(0, 2)
      .map(line => line.replace(/^[-\d.]+\s*/, '• ').replace(/\*\*/g, ''))
      .join('\n');

    // Format the WhatsApp message
    const message = `🚀 *Octup Sales Flash Report* 🚀
--------------------------
📊 *Status:*
${summaryLines.replace(/\*\*/g, '')}

${recommendations ? `⚠️ *Action Required:*\n${recommendations}\n` : ''}
--------------------------
_Sent from Octup Intelligence_
📅 ${formatTime(summaryData?.generated_at)}`;

    // Encode and open WhatsApp
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <Flex justifyContent="between" alignItems="start">
        <Flex justifyContent="start" className="space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <SparklesIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <Title className="text-blue-900">AI Executive Summary</Title>
            <Flex justifyContent="start" className="space-x-2 mt-1">
              <Badge color="blue" size="sm">
                {summaryData.model_version || 'Gemini 1.5'}
              </Badge>
              {summaryData.confidence_score && (
                <Badge color="emerald" size="sm">
                  {Math.round(summaryData.confidence_score * 100)}% confidence
                </Badge>
              )}
            </Flex>
          </div>
        </Flex>
        <Flex justifyContent="end" className="space-x-3 items-center">
          {/* WhatsApp Share Button */}
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            title="Share to WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <Flex justifyContent="end" className="space-x-1 text-gray-500">
            <ClockIcon className="h-4 w-4" />
            <Text className="text-xs">{formatTime(summaryData.generated_at)}</Text>
          </Flex>
        </Flex>
      </Flex>

      {/* AI Summary Content */}
      <div className="mt-4 p-4 bg-white/60 rounded-lg border border-blue-100 min-h-[100px]">
        {summaryLoading ? (
          // Loading state with pulse animation
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-blue-500 animate-pulse" />
              <Text className="text-blue-600 font-medium animate-pulse">
                Gemini is analyzing your pipeline...
              </Text>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <Text className="text-xs text-gray-400">
              Querying BigQuery views and generating insights...
            </Text>
          </div>
        ) : summaryError ? (
          // Error state
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Text className="text-amber-600 font-medium mb-2">
              Unable to generate AI summary
            </Text>
            <Text className="text-xs text-gray-500 mb-3">
              {summaryError}
            </Text>
            <button
              onClick={handleRegenerateSummary}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          </div>
        ) : summaryData.executive_insight ? (
          // Display the AI-generated summary
          formatInsight(summaryData.executive_insight)
        ) : (
          // Initial placeholder before loading starts
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Text className="text-gray-500">
              Loading dashboard data...
            </Text>
            <Text className="text-xs text-gray-400 mt-1">
              AI summary will appear once data is ready
            </Text>
          </div>
        )}
      </div>

      {/* Natural Language Query Section */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <Flex justifyContent="start" className="space-x-2 mb-3">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-indigo-600" />
          <Text className="font-medium text-indigo-900">Ask about your pipeline</Text>
        </Flex>

        {/* Query Input */}
        <Flex className="gap-2">
          <TextInput
            placeholder="e.g., Are we on track to hit our Q1 target?"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuerySubmit()}
            className="flex-1"
          />
          <Button
            onClick={handleQuerySubmit}
            disabled={!queryInput.trim() || queryLoading}
            loading={queryLoading}
            color="indigo"
          >
            {queryLoading ? 'Analyzing...' : 'Ask AI'}
          </Button>
        </Flex>

        {/* Example Queries */}
        <Flex className="mt-2 gap-2 flex-wrap">
          <Text className="text-xs text-gray-500">Try:</Text>
          {exampleQueries.map((query, idx) => (
            <button
              key={idx}
              onClick={() => handleExampleClick(query)}
              className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
            >
              {query}
            </button>
          ))}
        </Flex>

        {/* Query Result */}
        {queryResult && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <Flex justifyContent="between" alignItems="start" className="mb-2">
              <Text className="text-xs text-indigo-600 font-medium">
                Q: {queryResult.query}
              </Text>
              <Text className="text-xs text-gray-400">
                {formatTime(queryResult.generated_at)}
              </Text>
            </Flex>
            <div className="text-gray-800">
              {formatInsight(queryResult.insight)}
            </div>
          </div>
        )}
      </div>

      {/* Regenerate Button */}
      <Flex justifyContent="end" className="mt-3">
        <button
          onClick={handleRegenerateSummary}
          disabled={summaryLoading}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon className={`h-4 w-4 ${summaryLoading ? 'animate-spin' : ''}`} />
          <span>{summaryLoading ? 'Generating...' : 'Regenerate Summary'}</span>
        </button>
      </Flex>
    </Card>
  );
};

export default AIExecutiveSummary;
