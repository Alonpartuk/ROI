import React from 'react';
import {
  Card,
  Metric,
  Text,
  Flex,
  Grid,
  ProgressBar,
} from '@tremor/react';
import {
  CurrencyDollarIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { formatCurrency, formatPercent, formatPercentWhole } from '../services/api';
import { MetricInfoIcon } from './MetricTooltip';

/**
 * KPICards Component
 * Displays top-line KPIs from v_ceo_dashboard view
 * Responsive: 1 col (mobile) -> 2 cols (tablet) -> 4 cols (desktop)
 *
 * Features:
 * - Click to open drill-down modal
 * - Info icon with MetricTooltip from global glossary
 * - Mobile tap support for tooltips
 * - Premium rounded-3xl styling
 */
const KPICards = ({ data, onCardClick }) => {
  if (!data) return null;

  const kpis = [
    {
      id: 'total-pipeline',
      title: 'Total Pipeline',
      metricKey: 'Total Pipeline',
      metric: formatCurrency(data.total_pipeline_value),
      icon: CurrencyDollarIcon,
      subtext: `${data.total_deals_count} active deals`,
      color: 'blue',
      rawValue: data.total_pipeline_value,
    },
    {
      id: 'weighted-pipeline',
      title: 'Weighted Pipeline',
      metricKey: 'Weighted Pipeline',
      metric: formatCurrency(data.weighted_pipeline_value),
      icon: ScaleIcon,
      subtext: `${formatPercent((data.weighted_pipeline_value / data.total_pipeline_value) * 100)} of total`,
      color: 'indigo',
      rawValue: data.weighted_pipeline_value,
    },
    {
      id: 'at-risk',
      title: 'At Risk',
      metricKey: 'At Risk',
      metric: formatPercent(data.pct_deals_at_risk),
      icon: ExclamationTriangleIcon,
      subtext: `${data.at_risk_deals_count} deals (${formatCurrency(data.at_risk_value)})`,
      color: data.pct_deals_at_risk > 20 ? 'red' : data.pct_deals_at_risk > 10 ? 'amber' : 'emerald',
      isRisk: true,
      rawValue: data.pct_deals_at_risk,
    },
    {
      id: 'win-rate',
      title: 'Win Rate',
      metricKey: 'Win Rate',
      metric: formatPercentWhole(data.win_rate_pct),
      icon: TrophyIcon,
      subtext: `Avg cycle: ${Math.round(data.avg_sales_cycle_days)} days`,
      color: data.win_rate_pct >= 30 ? 'emerald' : data.win_rate_pct >= 20 ? 'amber' : 'red',
      rawValue: data.win_rate_pct,
    },
  ];

  // Handle card click
  const handleCardClick = (kpi) => {
    if (onCardClick) {
      onCardClick(kpi.title, data);
    }
  };

  return (
    <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-4 lg:gap-6">
      {kpis.map((kpi) => (
        <motion.div
          key={kpi.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="h-full"
        >
          <Card
            decoration="top"
            decorationColor={kpi.color}
            className="cursor-pointer hover:shadow-soft-lg transition-all duration-200 relative group h-full min-h-[140px]"
            onClick={() => handleCardClick(kpi)}
          >
            {/* Header with title and info icon */}
            <Flex justifyContent="between" alignItems="center">
              <Flex justifyContent="start" alignItems="center" className="space-x-1.5">
                <Text className="text-slate-600 font-medium">{kpi.title}</Text>
                <span onClick={(e) => e.stopPropagation()}>
                  <MetricInfoIcon metricKey={kpi.metricKey} size="sm" />
                </span>
              </Flex>
              <kpi.icon className={`h-5 w-5 text-${kpi.color}-500`} />
            </Flex>

            {/* Metric value */}
            <Flex
              justifyContent="start"
              alignItems="baseline"
              className="mt-3 space-x-2"
            >
              <Metric
                className={`tabular-nums ${kpi.isRisk && kpi.color === 'red' ? 'text-red-600 animate-pulse-risk' : 'text-slate-900'}`}
              >
                {kpi.metric}
              </Metric>
            </Flex>

            {/* Subtext */}
            <Text className="mt-2 text-slate-500">{kpi.subtext}</Text>

            {/* Progress bar for risk metric */}
            {kpi.isRisk && (
              <ProgressBar
                value={data.pct_deals_at_risk}
                color={kpi.color}
                className="mt-3"
              />
            )}

            {/* Click indicator - shows on hover */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Text className="text-xs text-slate-400">Click for details</Text>
            </div>
          </Card>
        </motion.div>
      ))}
    </Grid>
  );
};

export default KPICards;
