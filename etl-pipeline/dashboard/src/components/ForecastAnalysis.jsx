import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Flex,
  ProgressBar,
  Grid,
  Badge,
} from '@tremor/react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  LightBulbIcon,
  ChartPieIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, formatPercent, fetchPaceToGoal } from '../services/api';
import MetricInfo from './MetricInfo';

/**
 * Enhanced AI Analysis Display Component
 * Parses structured AI text into readable sections
 */
const AIAnalysisSection = ({ text, statusColor, remainingToTarget }) => {
  if (!text) return null;

  // Parse number from string
  const parseNum = (num) => {
    const cleaned = num.replace(/[,\s$]/g, '');
    return parseInt(cleaned, 10) || 0;
  };

  // Parse structured AI response
  const parseAIText = (rawText) => {
    const sections = [];

    // Clean the text
    let cleanText = rawText
      .replace(/\{[^}]+\}/g, '')
      .replace(/●\s*/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    // Try to extract REVENUE PROJECTION section
    const revenueMatch = cleanText.match(/REVENUE PROJECTION[:\s—-]*(.*?)(?=CONFIDENCE|$)/i);
    if (revenueMatch) {
      const revenueText = revenueMatch[1].trim();
      const mostLikely = revenueText.match(/Most Likely[:\s]*\$?([\d,]+)/i);
      const optimistic = revenueText.match(/Optimistic[:\s]*\$?([\d,]+)/i);
      const pessimistic = revenueText.match(/Pessimistic[:\s]*\$?([\d,]+)/i);

      if (mostLikely || optimistic || pessimistic) {
        sections.push({
          type: 'projection',
          icon: ChartPieIcon,
          color: 'text-blue-500',
          bg: 'bg-blue-50',
          title: 'Revenue Projection',
          items: [
            mostLikely && { label: 'Most Likely', value: parseNum(mostLikely[1]), highlight: true },
            optimistic && { label: 'Optimistic', value: parseNum(optimistic[1]) },
            pessimistic && { label: 'Pessimistic', value: parseNum(pessimistic[1]) },
          ].filter(Boolean)
        });
      }
    }

    // Try to extract Confidence Score from anywhere in text
    const confScoreMatch = cleanText.match(/Confidence Score[:\s]*(\d+)%?/i);

    // Build confidence section with actual remaining to target value (not from AI text)
    if (confScoreMatch || remainingToTarget > 0) {
      sections.push({
        type: 'confidence',
        icon: SparklesIcon,
        color: 'text-purple-500',
        bg: 'bg-purple-50',
        title: 'Confidence & Gap',
        items: [
          confScoreMatch && { label: 'Confidence Score', value: confScoreMatch[1], isPercent: true, highlight: true },
          remainingToTarget > 0 && { label: 'Gap to Target', value: remainingToTarget, isGap: true },
        ].filter(Boolean)
      });
    }

    // Extract explanatory sentences
    const explanations = [];

    // Look for "Most likely revenue is calculated..." type sentences
    const calcMatch = cleanText.match(/Most likely revenue is calculated[^.]+\./i);
    if (calcMatch) {
      explanations.push(calcMatch[0].trim());
    }

    // Look for "The optimistic scenario..." type sentences
    const scenarioMatch = cleanText.match(/The (optimistic|pessimistic) scenario[^.]+\./gi);
    if (scenarioMatch) {
      scenarioMatch.forEach(s => explanations.push(s.trim()));
    }

    // Look for other insights
    const insightPatterns = [
      /The high confidence[^.]+\./i,
      /based on the large pipeline[^.]+\./i,
    ];

    insightPatterns.forEach(pattern => {
      const match = cleanText.match(pattern);
      if (match && !explanations.includes(match[0].trim())) {
        explanations.push(match[0].trim());
      }
    });

    if (explanations.length > 0) {
      sections.push({
        type: 'insights',
        icon: LightBulbIcon,
        color: 'text-[#00CBC0]',
        bg: 'bg-[#00CBC0]/10',
        title: 'Key Insights',
        text: explanations.slice(0, 3)
      });
    }

    return sections;
  };

  const sections = parseAIText(text);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
          <SparklesIcon className="h-4 w-4 text-purple-600" />
        </div>
        <Text className="font-semibold text-gray-700">AI Insights</Text>
        <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent" />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, idx) => {
          const Icon = section.icon;

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl ${section.bg} transition-all duration-200`}
            >
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg bg-white/80 ${section.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <Text className={`text-sm font-semibold ${section.color}`}>
                  {section.title}
                </Text>
              </div>

              {/* Key-Value Items */}
              {section.items && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {section.items.map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 ${
                        item.isGap ? 'bg-[#FF3489]/10' :
                        item.highlight ? 'bg-white ring-1 ring-gray-200' : 'bg-white/60'
                      }`}
                    >
                      <Text className="text-xs text-gray-500 font-medium">{item.label}</Text>
                      <Text className={`text-2xl font-bold tabular-nums ${
                        item.isGap ? 'text-[#FF3489]' :
                        item.highlight ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {item.isPercent ? `${item.value}%` : formatCurrency(item.value)}
                      </Text>
                    </div>
                  ))}
                </div>
              )}

              {/* Text Insights */}
              {section.text && (
                <div className="space-y-2">
                  {section.text.map((t, i) => (
                    <Text key={i} className="text-sm text-gray-600 leading-relaxed">
                      {t}
                    </Text>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * ForecastAnalysis Component
 * Displays AI-generated forecast analysis and quarterly target progress
 * Aligned with Pace to Goal logic:
 * - Q1 Target = $1.6M Total ARR
 * - Starting ARR = Lifetime ARR at end of 2025
 * - Gap = $1.6M - Starting ARR - Q-T-D Won
 */
const ForecastAnalysis = ({ data }) => {
  const [paceData, setPaceData] = useState(null);

  useEffect(() => {
    const loadPaceData = async () => {
      try {
        const result = await fetchPaceToGoal();
        setPaceData(result);
      } catch (err) {
        console.error('Error loading pace data for forecast:', err);
      }
    };
    loadPaceData();
  }, []);

  if (!data) {
    return (
      <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
        <Title>Forecast Analysis</Title>
        <Text className="text-gray-500">Loading forecast data...</Text>
      </Card>
    );
  }

  const {
    forecasted_revenue = 0,
    optimistic_revenue = 0,
    pessimistic_revenue = 0,
    confidence_score = 0,
    forecasting_rationale = '',
    total_pipeline_value = 0,
    total_weighted_value = 0,
    historical_win_rate_pct = 0,
  } = data;

  // Use pace data for correct calculations
  const startingArr = paceData?.starting_arr || 0;
  const lifetimeArr = paceData?.lifetime_arr || 0;
  const qtdWonValue = paceData?.qtd_won_value || data.qtd_won_value || 0;
  const qtdWonCount = paceData?.qtd_won_count || data.qtd_won_count || 0;
  const quarterlyTarget = paceData?.quarterly_target || 1600000;
  const remainingToTarget = paceData?.remaining_to_target || (quarterlyTarget - startingArr);
  const dealsStillNeeded = paceData?.deals_still_needed || Math.ceil((remainingToTarget - qtdWonValue) / 40000);
  const progressPct = paceData?.progress_pct || (lifetimeArr / quarterlyTarget * 100);
  const timeElapsedPct = paceData?.time_elapsed_pct || 0;
  const gapVsExpected = paceData?.gap_vs_expected || 0;
  const paceStatus = paceData?.pace_status || 'BEHIND';

  // Current remaining = Original gap - Q-T-D won
  const currentRemaining = Math.max(remainingToTarget - qtdWonValue, 0);

  // Determine status based on pace
  const isOnTrack = paceStatus === 'ON_TRACK';
  const isAtRisk = paceStatus === 'AT_RISK';
  const statusColor = isOnTrack ? 'emerald' : isAtRisk ? 'amber' : 'red';

  return (
    <Card className="bg-white/80 backdrop-blur-2xl shadow-soft">
      <Flex justifyContent="between" alignItems="start">
        <div>
          <Flex justifyContent="start" alignItems="center" className="gap-2">
            <ChartBarIcon className="h-5 w-5 text-[#00CBC0]" />
            <Title>Q1 ARR Forecast</Title>
            <MetricInfo id="Quarterly Forecast" />
          </Flex>
          <Text className="mt-1">Progress toward $1.6M Total ARR target</Text>
        </div>
        <Badge
          color={statusColor}
          size="lg"
          icon={isOnTrack ? CheckCircleIcon : isAtRisk ? ExclamationTriangleIcon : ArrowTrendingDownIcon}
        >
          {isOnTrack ? 'On Track' : isAtRisk ? 'At Risk' : 'Behind Pace'}
        </Badge>
      </Flex>

      {/* Main Metrics - 3-column grid */}
      <Grid numItemsSm={3} className="gap-4 mt-6">
        <div className="p-4 rounded-xl bg-gray-50">
          <Text className="text-xs text-gray-500 font-medium">Starting ARR</Text>
          <Text className="text-xs text-gray-400">(End of 2025)</Text>
          <Text className="text-xl font-bold text-gray-700 mt-1 tabular-nums">
            {formatCurrency(startingArr)}
          </Text>
        </div>

        <div className="p-4 rounded-xl bg-[#00CBC0]/10">
          <Text className="text-xs text-gray-500 font-medium">Q1 Won So Far</Text>
          <Text className="text-xs text-gray-400">{qtdWonCount} deals closed</Text>
          <Text className="text-xl font-bold text-[#00CBC0] mt-1 tabular-nums">
            {formatCurrency(qtdWonValue)}
          </Text>
        </div>

        <div className="p-4 rounded-xl bg-[#FF3489]/10">
          <Text className="text-xs text-gray-500 font-medium">Still Needed</Text>
          <Text className="text-xs text-gray-400">{dealsStillNeeded} deals @ $40K</Text>
          <Text className="text-xl font-bold text-[#FF3489] mt-1 tabular-nums">
            {formatCurrency(currentRemaining)}
          </Text>
        </div>
      </Grid>

      {/* Progress Bar */}
      <div className="mt-6">
        <Flex justifyContent="between" className="mb-2">
          <Text className="text-sm font-medium">Progress to $1.6M Target</Text>
          <Flex className="gap-4">
            <Text className="text-sm tabular-nums">
              <span className="font-semibold text-[#00CBC0]">{progressPct.toFixed(1)}%</span> complete
            </Text>
            <Text className="text-sm text-gray-400 tabular-nums">
              {timeElapsedPct.toFixed(0)}% of Q1 elapsed
            </Text>
          </Flex>
        </Flex>
        <div className="relative">
          <ProgressBar value={progressPct} color="cyan" className="h-3" />
          <div
            className="absolute top-0 h-3 w-0.5 bg-gray-500"
            style={{ left: `${timeElapsedPct}%` }}
            title={`${timeElapsedPct}% of Q1 elapsed`}
          />
        </div>
      </div>

      {/* Pace Status */}
      <div className={`mt-4 p-3 rounded-xl ${gapVsExpected >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <Flex justifyContent="between" alignItems="center">
          <Flex className="gap-2" alignItems="center">
            {gapVsExpected >= 0 ? (
              <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
            ) : (
              <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
            )}
            <Text className={`font-medium ${gapVsExpected >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {gapVsExpected >= 0 ? 'Ahead of linear pace' : 'Behind linear pace'}
            </Text>
          </Flex>
          <Text className={`font-bold tabular-nums ${gapVsExpected >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {gapVsExpected >= 0 ? '+' : ''}{formatCurrency(gapVsExpected)}
          </Text>
        </Flex>
      </div>

      {/* AI Forecast Range */}
      {(forecasted_revenue > 0 || optimistic_revenue > 0) && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-100">
          <Flex className="mb-3" alignItems="center" justifyContent="between">
            <Text className="text-xs text-gray-500 font-medium">AI Forecast Range</Text>
            <Badge color="gray" size="sm">{confidence_score}% confidence</Badge>
          </Flex>
          <Grid numItemsSm={3} className="gap-4">
            <div className="text-center p-3 rounded-lg bg-white/60">
              <Text className="text-xs text-red-500 font-medium mb-1">Pessimistic</Text>
              <Text className="font-bold text-red-600 tabular-nums text-lg">{formatCurrency(pessimistic_revenue)}</Text>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/80 ring-2 ring-blue-200">
              <Text className="text-xs text-blue-500 font-medium mb-1">Expected</Text>
              <Text className="font-bold text-blue-600 tabular-nums text-lg">{formatCurrency(forecasted_revenue)}</Text>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/60">
              <Text className="text-xs text-emerald-500 font-medium mb-1">Optimistic</Text>
              <Text className="font-bold text-emerald-600 tabular-nums text-lg">{formatCurrency(optimistic_revenue)}</Text>
            </div>
          </Grid>
        </div>
      )}

      {/* Pipeline & Win Rate Context */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <Grid numItemsSm={3} className="gap-4">
          <div>
            <Text className="text-xs text-gray-400">Total Pipeline</Text>
            <Text className="font-semibold text-gray-700 tabular-nums">{formatCurrency(total_pipeline_value)}</Text>
          </div>
          <div>
            <Text className="text-xs text-gray-400">Weighted Pipeline</Text>
            <Text className="font-semibold text-gray-700 tabular-nums">{formatCurrency(total_weighted_value)}</Text>
          </div>
          <div>
            <Text className="text-xs text-gray-400">Win Rate (6mo)</Text>
            <Text className="font-semibold text-gray-700 tabular-nums">{formatPercent(historical_win_rate_pct)}</Text>
          </div>
        </Grid>
      </div>

      {/* AI Analysis Section */}
      {forecasting_rationale && (
        <AIAnalysisSection
          text={forecasting_rationale}
          statusColor={statusColor}
          remainingToTarget={remainingToTarget}
        />
      )}
    </Card>
  );
};

export default ForecastAnalysis;
