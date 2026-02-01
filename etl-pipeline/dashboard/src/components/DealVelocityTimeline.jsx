import React from 'react';
import { Text, Badge } from '@tremor/react';
import { Zap, Clock, TrendingUp, TrendingDown } from 'lucide-react';

// Stage order for determining forward/backward movement
const STAGE_ORDER = [
  'New Deal',
  'Meeting Scheduled',
  'Meeting Held',
  'Discovery',
  'Demo',
  'Proposal',
  'Negotiation',
  'Contract Sent',
  'Closed Won',
  'Closed Lost',
];

/**
 * DealVelocityTimeline Component
 * Shows a mini-timeline of deal stage movements over the last 14 days
 *
 * Props:
 * - movements: Array of { previous_stage, current_stage, transition_date, movement_type }
 * - variant: 'desktop' (horizontal) or 'mobile' (compact)
 */
const DealVelocityTimeline = ({ movements = [], variant = 'desktop' }) => {
  // No movements in 14 days
  if (!movements || movements.length === 0) {
    return (
      <div className={`flex items-center gap-1.5 ${variant === 'mobile' ? 'justify-center' : ''}`}>
        <Clock className="h-3.5 w-3.5 text-[#F9BD63]" />
        <Text className="text-xs text-[#F9BD63] font-medium">No movement in 14d</Text>
      </div>
    );
  }

  // Determine if high velocity (3+ moves)
  const isHighVelocity = movements.length >= 3;

  // Get stage index for determining direction
  const getStageIndex = (stageName) => {
    const normalizedStage = stageName?.toLowerCase().trim() || '';
    const index = STAGE_ORDER.findIndex(
      (s) => normalizedStage.includes(s.toLowerCase()) || s.toLowerCase().includes(normalizedStage)
    );
    return index >= 0 ? index : -1;
  };

  // Determine movement direction
  const getMovementDirection = (prevStage, currStage) => {
    const prevIndex = getStageIndex(prevStage);
    const currIndex = getStageIndex(currStage);
    if (prevIndex < 0 || currIndex < 0) return 'neutral';
    if (currIndex > prevIndex) return 'forward';
    if (currIndex < prevIndex) return 'backward';
    return 'neutral';
  };

  // Format date for tooltip
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Shorten stage name for display
  const shortenStage = (stageName) => {
    if (!stageName) return '?';
    const shortNames = {
      'new deal': 'New',
      'meeting scheduled': 'Sched',
      'meeting held': 'Held',
      'discovery': 'Disc',
      'demo': 'Demo',
      'proposal': 'Prop',
      'negotiation': 'Nego',
      'contract sent': 'Contract',
      'closed won': 'Won',
      'closed lost': 'Lost',
    };
    const normalized = stageName.toLowerCase().trim();
    for (const [key, value] of Object.entries(shortNames)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    return stageName.substring(0, 4);
  };

  // Desktop variant: Horizontal timeline
  if (variant === 'desktop') {
    return (
      <div className="flex items-center gap-1">
        {/* High Velocity Badge */}
        {isHighVelocity && (
          <div className="flex items-center gap-0.5 mr-1" title="High Velocity: 3+ stage changes in 14 days">
            <Zap className="h-3 w-3 text-[#00CBC0]" />
          </div>
        )}

        {/* Timeline dots and arrows */}
        <div className="flex items-center">
          {movements.map((movement, idx) => {
            const direction = getMovementDirection(movement.previous_stage, movement.current_stage);
            const isForward = direction === 'forward';
            const isBackward = direction === 'backward';

            return (
              <div key={idx} className="flex items-center group relative">
                {/* Arrow from previous */}
                {idx > 0 && (
                  <div
                    className={`w-3 h-0.5 mx-0.5 ${
                      isBackward ? 'bg-[#FF3489]' : 'bg-[#00CBC0]'
                    }`}
                  />
                )}

                {/* Stage dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-transform hover:scale-125 ${
                    isBackward
                      ? 'bg-[#FF3489] ring-1 ring-[#FF3489]/30'
                      : 'bg-[#00CBC0] ring-1 ring-[#00CBC0]/30'
                  }`}
                  title={`${movement.previous_stage || 'Start'} → ${movement.current_stage}\n${formatDate(movement.transition_date)}`}
                />

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#282831] text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  <div className="flex items-center gap-1">
                    {isForward && <TrendingUp className="h-2.5 w-2.5 text-[#00CBC0]" />}
                    {isBackward && <TrendingDown className="h-2.5 w-2.5 text-[#FF3489]" />}
                    <span>{shortenStage(movement.previous_stage)} → {shortenStage(movement.current_stage)}</span>
                  </div>
                  <div className="text-gray-400 text-[9px] mt-0.5">{formatDate(movement.transition_date)}</div>
                  {/* Tooltip arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#282831]" />
                </div>
              </div>
            );
          })}

          {/* Final stage indicator */}
          {movements.length > 0 && (
            <div className="ml-1 text-[9px] text-gray-500 font-medium">
              {shortenStage(movements[movements.length - 1].current_stage)}
            </div>
          )}
        </div>

        {/* Movement count */}
        <Badge
          size="xs"
          className={`ml-1 text-[9px] px-1.5 ${
            isHighVelocity
              ? 'bg-[#00CBC0]/10 text-[#00CBC0] border border-[#00CBC0]/20'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {movements.length}x
        </Badge>
      </div>
    );
  }

  // Mobile variant: Compact progress tracker
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <Text className="text-xs text-gray-500 font-medium">14-Day Journey</Text>
        <div className="flex items-center gap-1">
          {isHighVelocity && (
            <Badge size="xs" className="bg-[#00CBC0]/10 text-[#00CBC0] border border-[#00CBC0]/20">
              <Zap className="h-2.5 w-2.5 mr-0.5" />
              High Velocity
            </Badge>
          )}
          <Text className="text-xs text-gray-400">{movements.length} moves</Text>
        </div>
      </div>

      {/* Mobile timeline track */}
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex items-center">
          {movements.map((movement, idx) => {
            const direction = getMovementDirection(movement.previous_stage, movement.current_stage);
            const isBackward = direction === 'backward';
            const position = ((idx + 1) / movements.length) * 100;

            return (
              <div
                key={idx}
                className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 ${
                  isBackward
                    ? 'bg-[#FF3489] ring-2 ring-white'
                    : 'bg-[#00CBC0] ring-2 ring-white'
                }`}
                style={{ left: `${position}%` }}
                title={`${movement.previous_stage || 'Start'} → ${movement.current_stage}`}
              />
            );
          })}
        </div>
        {/* Progress fill */}
        <div
          className="h-full bg-gradient-to-r from-[#809292] to-[#00CBC0] rounded-full"
          style={{ width: '100%' }}
        />
      </div>

      {/* Stage labels */}
      <div className="flex justify-between mt-1.5">
        <Text className="text-[9px] text-gray-400">
          {movements.length > 0 ? shortenStage(movements[0].previous_stage) : 'Start'}
        </Text>
        <Text className="text-[9px] font-medium text-[#00CBC0]">
          {movements.length > 0 ? shortenStage(movements[movements.length - 1].current_stage) : 'Current'}
        </Text>
      </div>
    </div>
  );
};

export default DealVelocityTimeline;
