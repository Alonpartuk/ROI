import React, { useState } from 'react';
import { Card, Title, Text, Flex, Badge, TextInput, Button } from '@tremor/react';
import { SparklesIcon, ClockIcon, ChatBubbleLeftRightIcon, ArrowPathIcon, ShareIcon } from '@heroicons/react/24/outline';
import { MessageCircle } from 'lucide-react';

/**
 * AIExecutiveSummary Component
 * Displays AI-generated insights and supports natural language queries
 *
 * Props:
 * - data: AI summary data from ceo_summaries_history
 * - onQuery: callback for natural language query submission
 * - queryResult: result from AI query
 * - queryLoading: loading state for AI query
 */
const AIExecutiveSummary = ({ data, onQuery, queryResult, queryLoading }) => {
  const [queryInput, setQueryInput] = useState('');

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

  // Share to WhatsApp - formats AI insight for strategic sharing
  const handleWhatsAppShare = () => {
    const insight = summaryData?.executive_insight || '';

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

  // Provide fallback data if none provided
  const summaryData = data || {
    executive_insight: 'AI summary is loading... Ask questions about your pipeline below.',
    generated_at: new Date().toISOString(),
    model_version: 'Gemini 1.5',
    confidence_score: null,
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
      <div className="mt-4 p-4 bg-white/60 rounded-lg border border-blue-100">
        {formatInsight(summaryData.executive_insight)}
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
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1 transition-colors">
          <ArrowPathIcon className="h-4 w-4" />
          <span>Regenerate Summary</span>
        </button>
      </Flex>
    </Card>
  );
};

export default AIExecutiveSummary;
