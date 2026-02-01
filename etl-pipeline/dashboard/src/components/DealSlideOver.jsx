import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Badge, Text, Flex, ProgressBar } from '@tremor/react';
import {
  X,
  ExternalLink,
  Building2,
  User,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  Phone,
  Mail,
} from 'lucide-react';

/**
 * Deal Slide-Over Panel Component
 * Shows detailed deal information with activity timeline
 * Updated with Octup brand colors
 */
const DealSlideOver = ({ deal, isOpen, onClose, movements = [] }) => {
  if (!deal) return null;

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value?.toLocaleString() || 0}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Get deal movements for this specific deal
  const dealMovements = movements
    .filter(m => m.deal_id === deal.deal_id || m.deal_id === deal.hs_object_id)
    .sort((a, b) => new Date(b.transition_date) - new Date(a.transition_date));

  // Get risk badge with Octup colors
  const getRiskBadge = () => {
    if (deal.is_at_risk || deal.is_ghosted) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#FF3489]/10 text-[#FF3489] border border-[#FF3489]/20">
          At Risk
        </span>
      );
    }
    if (deal.is_stalled) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#F9BD63]/10 text-[#F9BD63] border border-[#F9BD63]/20">
          Stalled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#00CBC0]/10 text-[#00CBC0] border border-[#00CBC0]/20">
        Healthy
      </span>
    );
  };

  // Get recommended action with Octup colors
  const getRecommendedAction = () => {
    if (deal.days_since_last_activity > 10 || deal.is_ghosted) {
      return {
        action: 'Executive Outreach Required',
        description: 'No activity in 10+ days. Consider executive-level engagement.',
        bgColor: 'bg-[#FF3489]/10',
        borderColor: 'border-[#FF3489]/20',
        textColor: 'text-[#FF3489]',
        iconBg: 'bg-[#FF3489]/20',
        icon: AlertTriangle,
      };
    }
    if (deal.days_in_current_stage > 14 || deal.is_stalled) {
      return {
        action: 'Stage Review Needed',
        description: 'Deal has been in current stage too long. Review blockers.',
        bgColor: 'bg-[#F9BD63]/10',
        borderColor: 'border-[#F9BD63]/20',
        textColor: 'text-[#F9BD63]',
        iconBg: 'bg-[#F9BD63]/20',
        icon: Clock,
      };
    }
    if (!deal.has_upcoming_meeting) {
      return {
        action: 'Schedule Next Meeting',
        description: 'No meeting scheduled. Book a follow-up call.',
        bgColor: 'bg-[#809292]/10',
        borderColor: 'border-[#809292]/20',
        textColor: 'text-[#809292]',
        iconBg: 'bg-[#809292]/20',
        icon: Calendar,
      };
    }
    return {
      action: 'On Track',
      description: 'Continue with current engagement strategy.',
      bgColor: 'bg-[#00CBC0]/10',
      borderColor: 'border-[#00CBC0]/20',
      textColor: 'text-[#00CBC0]',
      iconBg: 'bg-[#00CBC0]/20',
      icon: CheckCircle,
    };
  };

  const recommendation = getRecommendedAction();
  const RecommendationIcon = recommendation.icon;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[#282831]/50 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            {/* Full-screen on mobile, slide-over on desktop */}
            <div className="pointer-events-none fixed inset-0 md:inset-y-0 md:right-0 md:left-auto flex md:max-w-full md:pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen md:max-w-md">
                  {/* Glassmorphism Panel */}
                  <div className="flex h-full flex-col bg-white/95 backdrop-blur-xl shadow-2xl md:border-l border-[#809292]/20">
                    {/* Header - Octup gradient with larger touch targets on mobile */}
                    <div className="bg-gradient-to-r from-[#809292] to-[#00CBC0] px-4 md:px-6 py-4 md:py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <Dialog.Title className="text-base md:text-lg font-semibold text-white truncate">
                            {deal.dealname || deal.deal_name || 'Unnamed Deal'}
                          </Dialog.Title>
                          <p className="text-white/80 text-sm mt-1 truncate">
                            {deal.company_name || 'No company'}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="ml-2 flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                          onClick={onClose}
                        >
                          <X className="h-6 w-6 md:h-5 md:w-5 text-white" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {getRiskBadge()}
                        {deal.is_enterprise && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white border border-white/30">
                            Enterprise
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                      {/* Deal Metadata */}
                      <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-[#282831] mb-3">Deal Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-[#00CBC0]" />
                            <div>
                              <Text className="text-gray-500 text-xs">ARR Value</Text>
                              <Text className="font-semibold text-[#00CBC0]">
                                {formatCurrency(deal.arr_value || deal.value_arr || deal.amount)}
                              </Text>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-[#809292]" />
                            <div>
                              <Text className="text-gray-500 text-xs">Stage</Text>
                              <Text className="font-medium text-[#282831]">
                                {deal.deal_stage_label || deal.current_stage || deal.dealstage_label}
                              </Text>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-[#809292]" />
                            <div>
                              <Text className="text-gray-500 text-xs">Owner</Text>
                              <Text className="font-medium text-[#282831]">{deal.owner_name || 'Unassigned'}</Text>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#F9BD63]" />
                            <div>
                              <Text className="text-gray-500 text-xs">Days in Stage</Text>
                              <Text className="font-medium text-[#282831]">
                                {deal.days_in_current_stage || deal.days_in_previous_stage || 0} days
                              </Text>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recommended Action */}
                      <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-[#282831] mb-3">Recommended Action</h3>
                        <div className={`p-4 rounded-xl ${recommendation.bgColor} border ${recommendation.borderColor}`}>
                          <Flex justifyContent="start" className="space-x-3">
                            <div className={`p-2 rounded-lg ${recommendation.iconBg}`}>
                              <RecommendationIcon className={`h-5 w-5 ${recommendation.textColor}`} />
                            </div>
                            <div>
                              <Text className={`font-semibold ${recommendation.textColor}`}>
                                {recommendation.action}
                              </Text>
                              <Text className="text-sm text-gray-600">
                                {recommendation.description}
                              </Text>
                            </div>
                          </Flex>
                        </div>
                      </div>

                      {/* Activity Metrics */}
                      <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-[#282831] mb-3">Activity Metrics</h3>
                        <div className="space-y-3">
                          <div>
                            <Flex justifyContent="between" className="mb-1">
                              <Text className="text-xs text-gray-500">Days Since Last Activity</Text>
                              <Text className="text-xs font-medium">
                                {deal.days_since_last_activity || 0} days
                              </Text>
                            </Flex>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  deal.days_since_last_activity > 7
                                    ? 'bg-[#FF3489]'
                                    : deal.days_since_last_activity > 3
                                    ? 'bg-[#F9BD63]'
                                    : 'bg-[#00CBC0]'
                                }`}
                                style={{ width: `${Math.min((deal.days_since_last_activity || 0) / 14 * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <Flex justifyContent="between" className="mb-1">
                              <Text className="text-xs text-gray-500">Contact Threading</Text>
                              <Text className="text-xs font-medium">
                                {deal.contact_count || 0} contacts
                              </Text>
                            </Flex>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  deal.contact_count >= 3
                                    ? 'bg-[#00CBC0]'
                                    : deal.contact_count >= 2
                                    ? 'bg-[#F9BD63]'
                                    : 'bg-[#FF3489]'
                                }`}
                                style={{ width: `${Math.min((deal.contact_count || 0) / 5 * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Activity Timeline */}
                      <div className="px-6 py-4">
                        <h3 className="text-sm font-semibold text-[#282831] mb-3">Activity Timeline</h3>
                        {dealMovements.length > 0 ? (
                          <div className="space-y-4">
                            {dealMovements.map((movement, idx) => (
                              <div key={idx} className="relative pl-6">
                                {/* Timeline line */}
                                {idx !== dealMovements.length - 1 && (
                                  <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
                                )}
                                {/* Timeline dot */}
                                <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 ${
                                  movement.movement_type === 'Closed'
                                    ? 'bg-[#00CBC0] border-[#00CBC0]'
                                    : movement.movement_type === 'New Deal'
                                    ? 'bg-[#809292] border-[#809292]'
                                    : 'bg-white border-gray-300'
                                }`} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Text className="font-medium text-[#282831] text-sm">
                                      {movement.previous_stage || 'New'}
                                    </Text>
                                    <ArrowRight className="h-3 w-3 text-gray-400" />
                                    <Text className="font-medium text-[#282831] text-sm">
                                      {movement.current_stage}
                                    </Text>
                                  </div>
                                  <Text className="text-xs text-gray-500 mt-0.5">
                                    {formatDate(movement.transition_date)}
                                    {movement.days_in_previous_stage > 0 && (
                                      <span className="ml-2 text-gray-400">
                                        ({movement.days_in_previous_stage} days in previous stage)
                                      </span>
                                    )}
                                  </Text>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-400">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <Text className="text-sm">No recent stage changes</Text>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer with HubSpot Button - Octup accent, safe area padding */}
                    <div className="border-t border-gray-200 px-4 md:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-[#F4F4F7]">
                      <a
                        href={deal.hubspot_url || `https://app.hubspot.com/contacts/0/deal/${deal.deal_id || deal.hs_object_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3.5 md:py-3 bg-gradient-to-r from-[#FF3489] to-[#F9BD63] text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[#FF3489]/30 min-h-[44px]"
                      >
                        <ExternalLink className="h-5 w-5" />
                        Open in HubSpot
                      </a>
                      <div className="flex items-center justify-center gap-6 md:gap-4 mt-4 md:mt-3">
                        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#809292] transition-colors min-h-[44px] px-2">
                          <Phone className="h-5 w-5 md:h-4 md:w-4" />
                          Call
                        </button>
                        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#809292] transition-colors min-h-[44px] px-2">
                          <Mail className="h-5 w-5 md:h-4 md:w-4" />
                          Email
                        </button>
                        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#809292] transition-colors min-h-[44px] px-2">
                          <MessageSquare className="h-5 w-5 md:h-4 md:w-4" />
                          Note
                        </button>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default DealSlideOver;
