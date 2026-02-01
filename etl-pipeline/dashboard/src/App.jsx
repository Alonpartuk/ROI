import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Flex, Title, Text, Badge, Callout, Grid } from '@tremor/react';
import {
  ChartPieIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ServerIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import {
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Users,
  Phone,
  TrendingDown,
  Settings,
} from 'lucide-react';

// Components
import FloatingNav from './components/FloatingNav';
import KPICards from './components/KPICards';
import AIExecutiveSummary from './components/AIExecutiveSummary';
import RiskCommandCenter from './components/RiskCommandCenter';
import RepRampChart from './components/RepRampChart';
import PendingRebook from './components/PendingRebook';
import ForecastAnalysis from './components/ForecastAnalysis';
import StageLeakage from './components/StageLeakage';
import CloseDateSlippage from './components/CloseDateSlippage';
import SalesVelocity from './components/SalesVelocity';
import WinRateAnalysis from './components/WinRateAnalysis';
import NextStepCoverage from './components/NextStepCoverage';
import MultiThreadingChart from './components/MultiThreadingChart';
import SDRLeaderboard from './components/SDRLeaderboard';
import PipelineTrendChart from './components/PipelineTrendChart';
import DailyDealMovements from './components/DailyDealMovements';
import OwnerLeaderboard from './components/OwnerLeaderboard';
import GlobalFilters from './components/GlobalFilters';
import StageTransitionMatrix from './components/StageTransitionMatrix';
import DealSlideOver from './components/DealSlideOver';
import DrillDownModal from './components/DrillDownModal';
import WinRateModal from './components/WinRateModal';
import {
  KPIRowSkeleton,
  ChartSkeleton,
  TableSkeleton,
  CardSkeleton,
  LeaderboardSkeleton,
} from './components/SkeletonLoader';

// New RevOps Strategic Layer Components
import LayerToggle, { LayerSection, LayerHeader } from './components/LayerToggle';
import PipelineQualityChart from './components/PipelineQualityChart';
import PaceToGoalTile from './components/PaceToGoalTile';
import StageSlippageTable from './components/StageSlippageTable';
import LeaderboardTimeTravel from './components/LeaderboardTimeTravel';
import ContactHealthShield from './components/ContactHealthShield';
import ZombieDealsTab from './components/ZombieDealsTab';
import DealFocusScoreCard from './components/DealFocusScoreCard';

// API Service (connects to BigQuery via backend)
import { fetchCriticalData, fetchSecondaryData, processAIQuery, APIError } from './services/api';

// Auth Context
import { useAuth } from './contexts/AuthContext';

/**
 * Octup Sales Dashboard - Long-Form Layout
 * =========================================
 *
 * 6 Scrollable Sections with Floating Navigation:
 * 1. Executive Insight (#exec) - KPIs, AI Summary
 * 2. Pipeline Forecast (#forecast) - Forecast Analysis, Pipeline Trend
 * 3. Risk Center (#risk) - Deals at Risk, Slippage, Pending Rebook
 * 4. Rep Performance (#performance) - Leaderboard, Velocity, Win Rate, Ramp
 * 5. SDR Hub (#sdr) - SDR Leaderboard, Meeting Outcomes
 * 6. Momentum & Leakage (#leakage) - Stage Leakage, Daily Movements
 */

// Data source toggle
const DATA_SOURCE = process.env.REACT_APP_DATA_SOURCE || 'api';

// Section Header Component with Lucide icons support - Premium styling with mobile optimization
const SectionHeader = ({ icon: Icon, title, subtitle, color = 'blue', badge }) => {
  // Color mapping for dynamic Tailwind classes
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-100' },
  };
  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="mb-4 md:mb-8 lg:mb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 lg:gap-4">
        <div className="flex items-center space-x-3 lg:space-x-4">
          <div className={`p-2 sm:p-2.5 lg:p-3 rounded-xl lg:rounded-2xl ${colors.bg} ring-1 ${colors.ring}`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 ${colors.text}`} />
          </div>
          <div>
            {/* Premium header: text-4xl on desktop, compact on mobile */}
            <h2 className="text-lg sm:text-xl lg:text-3xl xl:text-4xl font-bold text-[#809292] tracking-tight">{title}</h2>
            {subtitle && <Text className="text-xs sm:text-sm lg:text-base text-slate-500 hidden sm:block mt-1">{subtitle}</Text>}
          </div>
        </div>
        {badge}
      </div>
    </div>
  );
};

function App({ onAdminClick }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [aiQueryResult, setAiQueryResult] = useState(null);
  const [aiQueryLoading, setAiQueryLoading] = useState(false);

  // Global filters state
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [dealSizeFilter, setDealSizeFilter] = useState('all');

  // 4-Layer Focus Framework state
  const [activeLayer, setActiveLayer] = useState('pace');

  // Deal slide-over state
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  // KPI Drill-down modal state
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);

  // Win Rate Modal state
  const [isWinRateModalOpen, setIsWinRateModalOpen] = useState(false);

  // Auth context
  const { user, logout, isAdmin } = useAuth();

  // Two-phase data loading: Critical (Pace) first, then Secondary
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // PHASE 1: Load critical data first (KPIs, Pace, AI Summary)
      // This allows the user to see something immediately
      let criticalData;
      if (DATA_SOURCE === 'mock') {
        const mockModule = await import('./data/mockData');
        criticalData = await mockModule.fetchDashboardData();
      } else {
        criticalData = await fetchCriticalData();
      }

      // Show critical data immediately - user sees Pace layer
      setDashboardData(prev => ({
        ...prev,
        ...criticalData,
      }));
      setConnectionStatus('connected');
      setLoading(false); // Stop main loading spinner - UI is usable!
      setRefreshing(false);

      // PHASE 2: Load secondary data in background
      if (DATA_SOURCE !== 'mock') {
        setSecondaryLoading(true);
        try {
          const secondaryData = await fetchSecondaryData();
          setDashboardData(prev => ({
            ...prev,
            ...secondaryData,
          }));
        } catch (secondaryErr) {
          console.error('Secondary data load failed:', secondaryErr);
          // Don't show error - critical data is already displayed
        } finally {
          setSecondaryLoading(false);
        }
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);

      if (err instanceof APIError) {
        if (err.status === 0) {
          setError({
            type: 'connection',
            message: 'Cannot connect to API server',
            details: 'Make sure the backend server is running on port 3001',
          });
          setConnectionStatus('disconnected');
        } else if (err.status === 408) {
          setError({
            type: 'timeout',
            message: 'Request timed out',
            details: 'BigQuery query took too long. Try again.',
          });
        } else {
          setError({
            type: 'api',
            message: err.message,
            details: `Status: ${err.status}`,
          });
        }
      } else {
        setError({
          type: 'unknown',
          message: err.message || 'Failed to load dashboard data',
          details: null,
        });
      }

      if (!dashboardData) {
        setConnectionStatus('error');
      }
      setLoading(false);
      setRefreshing(false);
    }
  }, [dashboardData]);

  // Handle AI natural language query
  const handleAIQuery = useCallback(async (query) => {
    if (!query.trim()) return;

    setAiQueryLoading(true);
    try {
      const result = await processAIQuery(query, dashboardData);
      setAiQueryResult(result);
    } catch (err) {
      console.error('AI query failed:', err);
      setAiQueryResult({
        query,
        insight: 'Unable to process query. Please try again.',
        generated_at: new Date().toISOString(),
      });
    } finally {
      setAiQueryLoading(false);
    }
  }, [dashboardData]);

  // Handle deal click - open slide-over
  const handleDealClick = useCallback((deal) => {
    setSelectedDeal(deal);
    setIsSlideOverOpen(true);
  }, []);

  // Handle slide-over close
  const handleCloseSlideOver = useCallback(() => {
    setIsSlideOverOpen(false);
    setTimeout(() => setSelectedDeal(null), 300); // Clear after animation
  }, []);

  // Handle KPI card click - open drill-down modal
  const handleKPIClick = useCallback((metricName, data) => {
    console.log('Opening drill-down modal for:', metricName);
    console.log('KPI data:', data);

    // Open WinRateModal for Win Rate, otherwise use DrillDownModal
    if (metricName === 'Win Rate') {
      setIsWinRateModalOpen(true);
    } else {
      setSelectedMetric(metricName);
      setIsDrillDownOpen(true);
    }
  }, []);

  // Handle drill-down modal close
  const handleCloseDrillDown = useCallback(() => {
    console.log('Closing drill-down modal');
    setIsDrillDownOpen(false);
    setTimeout(() => setSelectedMetric(null), 300); // Clear after animation
  }, []);

  // Handle Win Rate modal close
  const handleCloseWinRateModal = useCallback(() => {
    setIsWinRateModalOpen(false);
  }, []);

  // Get unique owners from deals at risk data
  const owners = useMemo(() => {
    if (!dashboardData?.dealsAtRisk) return [];
    const ownerSet = new Set(
      dashboardData.dealsAtRisk
        .map(d => d.owner_name)
        .filter(Boolean)
    );
    return Array.from(ownerSet).sort();
  }, [dashboardData?.dealsAtRisk]);

  // Apply global filters to data
  const filteredData = useMemo(() => {
    if (!dashboardData) return null;

    // Filter function for deals
    const filterDeals = (deals) => {
      if (!deals) return deals;
      return deals.filter(deal => {
        // Owner filter
        if (selectedOwner !== 'all' && deal.owner_name !== selectedOwner) {
          return false;
        }
        // Deal size filter (Enterprise = $100K+)
        if (dealSizeFilter !== 'all') {
          const isEnterprise = (deal.arr_value || deal.value_arr || deal.amount || 0) >= 100000;
          if (dealSizeFilter === 'enterprise' && !isEnterprise) return false;
          if (dealSizeFilter === 'standard' && isEnterprise) return false;
        }
        return true;
      });
    };

    return {
      ...dashboardData,
      dealsAtRisk: filterDeals(dashboardData.dealsAtRisk),
      closeDateSlippage: filterDeals(dashboardData.closeDateSlippage),
      pendingRebook: filterDeals(dashboardData.pendingRebook),
    };
  }, [dashboardData, selectedOwner, dealSizeFilter]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Connection status indicator
  const ConnectionStatus = () => {
    const statusConfig = {
      connecting: { color: 'yellow', icon: WifiIcon, text: 'Connecting...' },
      connected: { color: 'emerald', icon: ServerIcon, text: 'Connected to BigQuery' },
      disconnected: { color: 'red', icon: WifiIcon, text: 'Disconnected' },
      error: { color: 'red', icon: ExclamationTriangleIcon, text: 'Error' },
    };

    const config = statusConfig[connectionStatus] || statusConfig.error;
    const Icon = config.icon;

    return (
      <Flex justifyContent="start" className="space-x-1">
        <Icon className={`h-3 w-3 text-${config.color}-500`} />
        <Text className={`text-xs text-${config.color}-600`}>{config.text}</Text>
      </Flex>
    );
  };

  // Loading state with skeleton loaders
  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        {/* Floating Navigation */}
        <FloatingNav onAdminClick={onAdminClick} />

        {/* Loading Status Bar */}
        <div className="bg-white/95 backdrop-blur-xl border-b border-slate-100 pt-12 sm:pt-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Flex justifyContent="center" alignItems="center" className="gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00CBC0]"></div>
              <Text className="text-sm text-[#00CBC0]">Connecting to BigQuery...</Text>
            </Flex>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Executive Section Skeleton */}
          <section className="mb-16">
            <div className="mb-6 flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-64 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <KPIRowSkeleton />
            <div className="mt-8">
              <CardSkeleton height="h-40" />
            </div>
          </section>

          {/* Forecast Section Skeleton */}
          <section className="mb-16">
            <div className="mb-6 flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-56 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </Grid>
          </section>

          {/* Risk Section Skeleton */}
          <section className="mb-16">
            <div className="mb-6 flex items-center space-x-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-72 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <TableSkeleton rows={5} columns={6} />
          </section>

          {/* Performance Section Skeleton */}
          <section className="mb-16">
            <div className="mb-6 flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-44 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-60 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <LeaderboardSkeleton />
          </section>
        </main>
      </div>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg p-8">
          {error.type === 'connection' ? (
            <WifiIcon className="h-12 w-12 text-red-500 mx-auto" />
          ) : (
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
          )}
          <Title className="mt-4 text-red-900">{error.message}</Title>
          <Text className="mt-2 text-gray-600">{error.details}</Text>

          {error.type === 'connection' && (
            <Callout title="Quick Fix" color="blue" className="mt-4 text-left">
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Open a new terminal</li>
                <li>Navigate to: <code className="bg-blue-50 px-1">dashboard/server</code></li>
                <li>Run: <code className="bg-blue-50 px-1">npm install && npm start</code></li>
                <li>Click "Try Again" below</li>
              </ol>
            </Callout>
          )}

          <Flex justifyContent="center" className="mt-6 space-x-3">
            <button
              onClick={() => loadData()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            {DATA_SOURCE === 'api' && (
              <button
                onClick={() => {
                  window.location.href = '?mock=true';
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Use Demo Data
              </button>
            )}
          </Flex>
        </div>
      </div>
    );
  }

  // Calculate counts for badges (using filtered data)
  const atRiskCount = filteredData?.dealsAtRisk?.filter((d) => d.is_at_risk).length || 0;
  const pendingRebookCount = filteredData?.pendingRebook?.length || 0;
  const slippageCount = filteredData?.closeDateSlippage?.filter(d => d.days_slipped > 0).length || 0;

  // Total vs filtered counts for filter display
  const totalDeals = dashboardData?.dealsAtRisk?.length || 0;
  const filteredDealsCount = filteredData?.dealsAtRisk?.length || 0;

  return (
    <div className="min-h-screen bg-premium bg-premium-pattern overflow-x-hidden">
      {/* Deal Slide-Over Panel */}
      <DealSlideOver
        deal={selectedDeal}
        isOpen={isSlideOverOpen}
        onClose={handleCloseSlideOver}
        movements={dashboardData?.dailyDealMovements || []}
      />

      {/* KPI Drill-Down Modal */}
      <DrillDownModal
        isOpen={isDrillDownOpen}
        onClose={handleCloseDrillDown}
        metric={selectedMetric}
        data={dashboardData?.kpis}
        dealsAtRisk={dashboardData?.dealsAtRisk}
        closeDateSlippage={dashboardData?.closeDateSlippage}
      />

      {/* Win Rate Drill-Down Modal */}
      <WinRateModal
        isOpen={isWinRateModalOpen}
        onClose={handleCloseWinRateModal}
        data={dashboardData?.kpis}
      />

      {/* Floating Navigation */}
      <FloatingNav onAdminClick={onAdminClick} />

      {/* Error Banner */}
      {error && dashboardData && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 fixed top-0 left-0 right-0 z-50">
          <Flex justifyContent="center" className="space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
            <Text className="text-sm text-amber-800">
              {error.message} - Showing cached data from {lastRefresh?.toLocaleTimeString()}
            </Text>
            <button
              onClick={() => loadData(true)}
              className="text-sm text-amber-700 underline hover:text-amber-900"
            >
              Retry
            </button>
          </Flex>
        </div>
      )}

      {/* Compact Status Bar - Below Logo Badge */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-slate-100 z-20 pt-12 sm:pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Flex justifyContent="between" alignItems="center">
            <Flex justifyContent="start" alignItems="center" className="gap-3">
              <ConnectionStatus />
              {DATA_SOURCE === 'mock' && (
                <Badge color="amber" size="sm">Demo Mode</Badge>
              )}
            </Flex>

            <Flex justifyContent="end" alignItems="center" className="gap-4">
              <Flex justifyContent="end" alignItems="center" className="gap-2 text-gray-500">
                <ArrowPathIcon className={`h-4 w-4 ${(refreshing || secondaryLoading) ? 'animate-spin' : ''}`} />
                <Text className="text-xs hidden sm:inline">
                  {secondaryLoading
                    ? 'Loading details...'
                    : lastRefresh
                      ? `Updated ${lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                      : 'Loading...'}
                </Text>
              </Flex>

              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="px-3 py-1.5 text-sm font-medium text-[#00CBC0] hover:bg-[#00CBC0]/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {refreshing ? '...' : 'Refresh'}
              </button>

              {/* Admin Button - Only visible to admin */}
              {isAdmin() && onAdminClick && (
                <button
                  onClick={onAdminClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#00CBC0] hover:bg-[#00CBC0]/10 rounded-lg transition-colors"
                  title="Admin Panel"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}

              <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200">
                <Text className="text-sm text-gray-600">{user?.email}</Text>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>

              {/* Mobile Sign Out */}
              <button
                onClick={logout}
                className="sm:hidden text-xs text-gray-500 hover:text-red-600 px-2 py-1"
              >
                Sign Out
              </button>
            </Flex>
          </Flex>
        </div>
      </div>

      {/* Global Filters - Desktop only */}
      <div className="hidden md:block bg-white/90 backdrop-blur-xl border-b border-slate-100 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <GlobalFilters
          owners={owners}
          selectedOwner={selectedOwner}
          onOwnerChange={setSelectedOwner}
          dealSizeFilter={dealSizeFilter}
          onDealSizeChange={setDealSizeFilter}
          totalDeals={totalDeals}
          filteredDeals={filteredDealsCount}
        />
      </div>

      {/* Floating Layer Toggle - Desktop only (fixed right sidebar) */}
      <div className="hidden lg:block">
        <LayerToggle
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          variant="desktop"
        />
      </div>

      {/* Mobile/Tablet Layer Toggle - Below status bar */}
      <div className="lg:hidden flex justify-center py-2 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <LayerToggle
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          variant="mobile"
        />
      </div>

      {/* Main Content - Premium spacing on desktop, tight on mobile */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8 pb-8 lg:pb-12">

        {/* ============================================ */}
        {/* LAYER 1: Pace Control - Are we on pace? */}
        {/* ============================================ */}
        <LayerSection id="pace" activeLayer={activeLayer} className="mb-12 lg:mb-20 xl:mb-24 scroll-mt-24 lg:scroll-mt-32">
          <LayerHeader layer="pace" />

          {/* Pace to Goal & Pipeline Quality - HIGH PRIORITY at TOP */}
          <Grid numItemsSm={1} numItemsLg={2} className="gap-4 lg:gap-8 mb-6 lg:mb-8">
            <PaceToGoalTile data={dashboardData?.paceToGoal} />
            <PipelineQualityChart data={dashboardData?.pipelineQualityTrend} />
          </Grid>

          {/* KPI Cards - Click for drill-down */}
          <div className="mb-6 lg:mb-8">
            <KPICards data={dashboardData?.kpis} onCardClick={handleKPIClick} />
          </div>

          {/* Daily Deal Movements */}
          <div className="mb-6 lg:mb-8">
            <DailyDealMovements
              data={dashboardData?.dailyDealMovements}
              onDealClick={handleDealClick}
            />
          </div>

          {/* AI Executive Summary */}
          <div className="mb-6 lg:mb-8">
            <AIExecutiveSummary
              data={dashboardData?.aiSummary}
              onQuery={handleAIQuery}
              queryResult={aiQueryResult}
              queryLoading={aiQueryLoading}
            />
          </div>

          {/* Forecast Analysis & Pipeline Trend */}
          <Grid numItemsSm={1} numItemsLg={2} className="gap-4 lg:gap-8">
            <ForecastAnalysis data={dashboardData?.forecastAnalysis} />
            <PipelineTrendChart
              data={dashboardData?.pipelineTrend}
              periodWonDeals={dashboardData?.periodWonDeals}
            />
          </Grid>
        </LayerSection>

        {/* ============================================ */}
        {/* LAYER 2: Gap Analysis - Where is the gap? */}
        {/* ============================================ */}
        <LayerSection id="gaps" activeLayer={activeLayer} className="mb-12 lg:mb-20 xl:mb-24 scroll-mt-24 lg:scroll-mt-32">
          <LayerHeader layer="gaps" />

          {/* Stage Slippage Table */}
          <div className="mb-6 lg:mb-8">
            <StageSlippageTable />
          </div>

          {/* Close Date Slippage & Stage Leakage */}
          <Grid numItemsSm={1} numItemsLg={2} className="gap-4 lg:gap-8 mb-6 lg:mb-8">
            <CloseDateSlippage data={filteredData?.closeDateSlippage} />
            <StageLeakage data={dashboardData?.stageLeakage} />
          </Grid>

          {/* Sales Velocity */}
          <div className="mb-6 lg:mb-8">
            <SalesVelocity data={dashboardData?.salesVelocity} />
          </div>

          {/* Stage Transition Matrix */}
          <div className="mb-6 lg:mb-8">
            <StageTransitionMatrix
              data={dashboardData?.dailyDealMovements}
              onDealClick={handleDealClick}
            />
          </div>
        </LayerSection>

        {/* ============================================ */}
        {/* LAYER 3: Accountability - Who owns the gap? */}
        {/* ============================================ */}
        <LayerSection id="reps" activeLayer={activeLayer} className="mb-12 lg:mb-20 xl:mb-24 scroll-mt-24 lg:scroll-mt-32">
          <LayerHeader layer="reps" />

          {/* Leaderboard with Time Travel */}
          <div className="mb-6 lg:mb-8">
            <LeaderboardTimeTravel />
          </div>

          {/* SDR Leaderboard & Win Rate */}
          <Grid numItemsSm={1} numItemsLg={2} className="gap-4 lg:gap-8 mb-6 lg:mb-8">
            <SDRLeaderboard data={dashboardData?.sdrLeaderboard} />
            <WinRateAnalysis data={dashboardData?.winRateAnalysis} />
          </Grid>

          {/* Rep Ramp Chart */}
          <div className="mb-6 lg:mb-8">
            <RepRampChart data={dashboardData?.repRamp} />
          </div>

          {/* Deal Focus Scores */}
          <div className="mb-6 lg:mb-8">
            <DealFocusScoreCard />
          </div>
        </LayerSection>

        {/* ============================================ */}
        {/* LAYER 4: Action Center - What fixes it? */}
        {/* ============================================ */}
        <LayerSection id="action" activeLayer={activeLayer} className="mb-12 lg:mb-20 xl:mb-24 scroll-mt-24 lg:scroll-mt-32">
          <LayerHeader layer="action" />

          {/* Contact Health Shield */}
          <div className="mb-6 lg:mb-8">
            <ContactHealthShield />
          </div>

          {/* Risk Command Center */}
          <div className="mb-6 lg:mb-8">
            <RiskCommandCenter
              data={filteredData?.dealsAtRisk}
              onDealClick={handleDealClick}
              dealVelocity={dashboardData?.dealVelocity || {}}
            />
          </div>

          {/* Zombie Deals */}
          <div className="mb-6 lg:mb-8">
            <ZombieDealsTab />
          </div>

          {/* Multi-Threading & Next Step Coverage */}
          <Grid numItemsSm={1} numItemsLg={2} className="gap-4 lg:gap-8 mb-6 lg:mb-8">
            <NextStepCoverage data={dashboardData?.nextStepCoverage} />
            <MultiThreadingChart data={dashboardData?.multiThreading} />
          </Grid>

          {/* Pending Rebook */}
          {pendingRebookCount > 0 && (
            <PendingRebook data={filteredData?.pendingRebook} />
          )}
        </LayerSection>

      </main>

      {/* Footer - Premium styling, hidden on mobile */}
      <footer className="hidden lg:block bg-white/80 backdrop-blur-xl border-t border-slate-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Flex justifyContent="between" alignItems="center">
            <Text className="text-sm text-slate-400">
              Data source: BigQuery (octup-testing.hubspot_data)
              {DATA_SOURCE === 'mock' && ' [DEMO MODE]'}
            </Text>
            <Text className="text-sm text-slate-400">
              Pipeline: 3PL New Business | Enterprise threshold: $100K ARR
            </Text>
          </Flex>
        </div>
      </footer>
    </div>
  );
}

export default App;
