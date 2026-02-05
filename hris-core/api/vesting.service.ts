/**
 * Vesting Calculation Service
 *
 * Handles all equity vesting calculations including:
 * - Generating vesting schedules
 * - Calculating next vesting date
 * - Processing vesting events
 * - Milestone vesting logic
 */

import {
  EquityGrant,
  VestingType,
  VestingEvent,
  VestingScheduleItem,
  VestingCalculationResult,
  // Reserved for milestone vesting implementation
  VestingMilestone as _VestingMilestone,
  MilestoneConfig as _MilestoneConfig,
  ISODate,
} from '../types/employee.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const _MONTHS_IN_YEAR = 12; // Reserved for future annual calculations

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Add months to a date, handling edge cases
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);

  // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
  if (result.getMonth() !== ((date.getMonth() + months) % 12 + 12) % 12) {
    result.setDate(0); // Set to last day of previous month
  }

  return result;
}

/**
 * Calculate months between two dates
 * Reserved for future use in schedule calculations
 */
function _monthsBetween(start: Date, end: Date): number {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}

/**
 * Parse ISO date string to Date
 */
function parseDate(dateStr: ISODate): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/**
 * Format Date to ISO date string
 */
function formatDate(date: Date): ISODate {
  return date.toISOString().split('T')[0] as ISODate;
}

// ============================================================================
// VESTING SCHEDULE GENERATION
// ============================================================================

/**
 * Generate a complete vesting schedule for a grant
 *
 * Supports multiple vesting types:
 * - LINEAR: Equal monthly vesting over the total period
 * - CLIFF_THEN_LINEAR: One-time cliff vest, then monthly thereafter
 * - MILESTONE: Custom milestones with specific dates/conditions
 * - CUSTOM: Arbitrary schedule defined in milestoneConfig
 */
export function generateVestingSchedule(grant: EquityGrant): VestingScheduleItem[] {
  switch (grant.vestingType) {
    case VestingType.LINEAR:
      return generateLinearSchedule(grant);

    case VestingType.CLIFF_THEN_LINEAR:
      return generateCliffThenLinearSchedule(grant);

    case VestingType.MILESTONE:
      return generateMilestoneSchedule(grant);

    case VestingType.CUSTOM:
      if (!grant.milestoneConfig) {
        throw new Error('Custom vesting requires milestoneConfig');
      }
      return generateCustomSchedule(grant);

    default:
      throw new Error(`Unknown vesting type: ${grant.vestingType}`);
  }
}

/**
 * LINEAR vesting: Equal monthly vesting
 *
 * Example: 48,000 shares over 48 months = 1,000 shares/month
 */
function generateLinearSchedule(grant: EquityGrant): VestingScheduleItem[] {
  const schedule: VestingScheduleItem[] = [];
  const startDate = parseDate(grant.vestingStartDate);
  const sharesPerPeriod = Math.floor(grant.sharesGranted / grant.totalVestingMonths);
  let remainingShares = grant.sharesGranted;
  let cumulativeShares = 0;

  for (let month = 1; month <= grant.totalVestingMonths; month++) {
    const vestingDate = addMonths(startDate, month);

    // Handle rounding: last period gets remaining shares
    const sharesToVest =
      month === grant.totalVestingMonths
        ? remainingShares
        : sharesPerPeriod;

    cumulativeShares += sharesToVest;
    remainingShares -= sharesToVest;

    const item: VestingScheduleItem = {
      date: formatDate(vestingDate),
      shares: sharesToVest,
      cumulativeShares,
      percentOfGrant: (cumulativeShares / grant.sharesGranted) * 100,
      status: getVestingStatus(vestingDate, grant),
      isMilestone: false,
    };

    schedule.push(item);
  }

  return schedule;
}

/**
 * CLIFF_THEN_LINEAR vesting: Standard startup option vesting
 *
 * Example: 48,000 shares, 12-month cliff, 48 months total
 * - Month 12: 12,000 shares vest (25%)
 * - Months 13-48: 1,000 shares/month
 *
 * This is the most common pattern (Workday, HiBob default)
 */
function generateCliffThenLinearSchedule(grant: EquityGrant): VestingScheduleItem[] {
  const schedule: VestingScheduleItem[] = [];
  const startDate = parseDate(grant.vestingStartDate);
  const cliffMonths = grant.cliffMonths || 12;

  // Calculate cliff shares (proportional to cliff period)
  const cliffShares = Math.floor(
    (grant.sharesGranted * cliffMonths) / grant.totalVestingMonths
  );

  // Calculate monthly shares after cliff
  const remainingMonths = grant.totalVestingMonths - cliffMonths;
  const monthlyShares = remainingMonths > 0
    ? Math.floor((grant.sharesGranted - cliffShares) / remainingMonths)
    : 0;

  let cumulativeShares = 0;
  let sharesRemaining = grant.sharesGranted;

  // Cliff vesting event
  const cliffDate = addMonths(startDate, cliffMonths);
  cumulativeShares = cliffShares;
  sharesRemaining -= cliffShares;

  schedule.push({
    date: formatDate(cliffDate),
    shares: cliffShares,
    cumulativeShares,
    percentOfGrant: (cumulativeShares / grant.sharesGranted) * 100,
    status: getVestingStatus(cliffDate, grant),
    isMilestone: true,
    milestoneDescription: `${cliffMonths}-month cliff`,
  });

  // Monthly vesting after cliff
  for (let month = cliffMonths + 1; month <= grant.totalVestingMonths; month++) {
    const vestingDate = addMonths(startDate, month);

    // Last month gets remaining shares (handle rounding)
    const sharesToVest =
      month === grant.totalVestingMonths ? sharesRemaining : monthlyShares;

    cumulativeShares += sharesToVest;
    sharesRemaining -= sharesToVest;

    schedule.push({
      date: formatDate(vestingDate),
      shares: sharesToVest,
      cumulativeShares,
      percentOfGrant: (cumulativeShares / grant.sharesGranted) * 100,
      status: getVestingStatus(vestingDate, grant),
      isMilestone: false,
    });
  }

  return schedule;
}

/**
 * MILESTONE vesting: Based on achieving specific milestones
 *
 * Example: Performance-based RSUs that vest on product launch,
 * revenue targets, etc.
 */
function generateMilestoneSchedule(grant: EquityGrant): VestingScheduleItem[] {
  if (!grant.milestoneConfig?.milestones) {
    throw new Error('Milestone vesting requires milestoneConfig.milestones');
  }

  const schedule: VestingScheduleItem[] = [];
  let cumulativeShares = 0;

  for (const milestone of grant.milestoneConfig.milestones) {
    const sharesToVest = Math.floor(
      (grant.sharesGranted * milestone.sharesPercent) / 100
    );
    cumulativeShares += sharesToVest;

    // Use completion date if completed, otherwise target date
    const vestingDate = milestone.completedDate || milestone.targetDate;
    if (!vestingDate) {
      continue; // Skip milestones without dates
    }

    schedule.push({
      date: vestingDate,
      shares: sharesToVest,
      cumulativeShares,
      percentOfGrant: (cumulativeShares / grant.sharesGranted) * 100,
      status: milestone.isCompleted ? 'vested' : 'scheduled',
      isMilestone: true,
      milestoneDescription: milestone.description,
    });
  }

  return schedule.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * CUSTOM vesting: Arbitrary schedule
 */
function generateCustomSchedule(grant: EquityGrant): VestingScheduleItem[] {
  // Custom schedules use the milestone structure but with fixed dates
  return generateMilestoneSchedule(grant);
}

/**
 * Determine vesting status based on date
 */
function getVestingStatus(
  vestingDate: Date,
  grant: EquityGrant
): 'vested' | 'scheduled' | 'forfeited' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if grant has been forfeited (e.g., termination)
  if (grant.sharesForfeited > 0) {
    // If the vesting date is after the forfeiture would occur
    // This is simplified - real logic would track forfeiture date
    return 'forfeited';
  }

  return vestingDate <= today ? 'vested' : 'scheduled';
}

// ============================================================================
// NEXT VESTING DATE CALCULATION
// ============================================================================

/**
 * Calculate the next vesting date and shares for a grant
 *
 * LOGIC:
 * 1. If grant has no unvested shares, return null
 * 2. For milestone vesting, find next incomplete milestone
 * 3. For time-based vesting, calculate based on schedule
 * 4. Consider termination/forfeiture scenarios
 */
export function calculateNextVestingDate(
  grant: EquityGrant,
  existingEvents?: VestingEvent[]
): { nextDate: ISODate | null; shares: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if there are unvested shares
  const unvestedShares =
    grant.sharesGranted - grant.sharesVested - grant.sharesForfeited;
  if (unvestedShares <= 0) {
    return { nextDate: null, shares: 0 };
  }

  // If we have existing vesting events, use those
  if (existingEvents && existingEvents.length > 0) {
    const futureEvents = existingEvents
      .filter(e => e.isScheduled && parseDate(e.vestingDate) > today)
      .sort((a, b) => a.vestingDate.localeCompare(b.vestingDate));

    if (futureEvents.length > 0) {
      return {
        nextDate: futureEvents[0].vestingDate,
        shares: futureEvents[0].sharesVested,
      };
    }
  }

  // Generate schedule and find next event
  const schedule = generateVestingSchedule(grant);
  const nextEvent = schedule.find(
    item => item.status === 'scheduled' && parseDate(item.date) > today
  );

  if (!nextEvent) {
    return { nextDate: null, shares: 0 };
  }

  return {
    nextDate: nextEvent.date,
    shares: nextEvent.shares,
  };
}

/**
 * Calculate next vesting for all grants of an employee
 */
export function calculateEmployeeNextVesting(
  grants: EquityGrant[]
): {
  nextDate: ISODate | null;
  shares: number;
  grantId: string;
  grantNumber: string;
} | null {
  const results = grants
    .map(grant => ({
      ...calculateNextVestingDate(grant),
      grantId: grant.id,
      grantNumber: grant.grantNumber,
    }))
    .filter(r => r.nextDate !== null);

  if (results.length === 0) {
    return null;
  }

  // Sort by date and return the soonest
  results.sort((a, b) => a.nextDate!.localeCompare(b.nextDate!));
  return results[0] as {
    nextDate: ISODate;
    shares: number;
    grantId: string;
    grantNumber: string;
  };
}

// ============================================================================
// FULL VESTING CALCULATION
// ============================================================================

/**
 * Calculate complete vesting information for a grant
 *
 * Returns:
 * - Next vesting date and shares
 * - Total vested to date
 * - Total unvested
 * - Full schedule
 * - Percent complete
 */
export function calculateVesting(grant: EquityGrant): VestingCalculationResult {
  const schedule = generateVestingSchedule(grant);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate totals from schedule
  let totalVestedFromSchedule = 0;
  let totalUnvested = 0;

  for (const item of schedule) {
    if (item.status === 'vested') {
      totalVestedFromSchedule += item.shares;
    } else if (item.status === 'scheduled') {
      totalUnvested += item.shares;
    }
  }

  // Find next vesting
  const { nextDate, shares: nextShares } = calculateNextVestingDate(grant);

  // Calculate percent complete
  const percentComplete =
    grant.sharesGranted > 0
      ? (grant.sharesVested / grant.sharesGranted) * 100
      : 0;

  return {
    nextVestingDate: nextDate,
    nextVestingShares: nextShares,
    totalVestedToDate: grant.sharesVested,
    totalUnvested: grant.sharesGranted - grant.sharesVested - grant.sharesForfeited,
    vestingSchedule: schedule,
    percentComplete,
  };
}

// ============================================================================
// VESTING EVENT PROCESSING
// ============================================================================

/**
 * Process a vesting event (called by scheduled job)
 *
 * This function is called when a vesting date arrives.
 * It updates the grant's vested shares count.
 */
export async function processVestingEvent(
  event: VestingEvent,
  grant: EquityGrant,
  updateGrant: (grantId: string, updates: Partial<EquityGrant>) => Promise<void>,
  updateEvent: (eventId: string, updates: Partial<VestingEvent>) => Promise<void>
): Promise<void> {
  // Validate the event can be processed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = parseDate(event.vestingDate);

  if (eventDate > today) {
    throw new Error('Cannot process future vesting event');
  }

  if (!event.isScheduled) {
    throw new Error('Event has already been processed');
  }

  // Check for sufficient unvested shares
  const unvestedShares =
    grant.sharesGranted - grant.sharesVested - grant.sharesForfeited;
  if (event.sharesVested > unvestedShares) {
    throw new Error('Insufficient unvested shares');
  }

  // Update grant
  await updateGrant(grant.id, {
    sharesVested: grant.sharesVested + event.sharesVested,
  });

  // Mark event as processed
  await updateEvent(event.id, {
    isScheduled: false,
    processedAt: new Date().toISOString(),
  });
}

/**
 * Handle grant forfeiture (e.g., on termination)
 *
 * Calculates unvested shares to be forfeited based on termination date
 */
export function calculateForfeiture(
  grant: EquityGrant,
  terminationDate: Date
): {
  sharesToForfeit: number;
  vestedAtTermination: number;
  exerciseDeadline: Date;
} {
  // Calculate vested shares as of termination
  const schedule = generateVestingSchedule(grant);
  let vestedAtTermination = 0;

  for (const item of schedule) {
    const itemDate = parseDate(item.date);
    if (itemDate <= terminationDate) {
      vestedAtTermination += item.shares;
    }
  }

  // Unvested shares are forfeited
  const sharesToForfeit = grant.sharesGranted - vestedAtTermination;

  // Calculate exercise deadline (post-termination exercise window)
  const exerciseDeadline = new Date(terminationDate);
  exerciseDeadline.setMonth(
    exerciseDeadline.getMonth() + grant.postTerminationExerciseMonths
  );

  return {
    sharesToForfeit,
    vestedAtTermination,
    exerciseDeadline,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format vesting schedule for display
 */
export function formatVestingScheduleForDisplay(
  schedule: VestingScheduleItem[]
): string {
  const summary = {
    vested: 0,
    scheduled: 0,
    forfeited: 0,
  };

  for (const item of schedule) {
    summary[item.status] += item.shares;
  }

  return `Vested: ${summary.vested.toLocaleString()} | Scheduled: ${summary.scheduled.toLocaleString()} | Forfeited: ${summary.forfeited.toLocaleString()}`;
}

/**
 * Get vesting events for the next N months
 */
export function getUpcomingVestingEvents(
  grants: EquityGrant[],
  months: number = 12
): { grant: EquityGrant; events: VestingScheduleItem[] }[] {
  const today = new Date();
  const endDate = addMonths(today, months);

  return grants.map(grant => {
    const schedule = generateVestingSchedule(grant);
    const upcomingEvents = schedule.filter(item => {
      const itemDate = parseDate(item.date);
      return item.status === 'scheduled' && itemDate >= today && itemDate <= endDate;
    });

    return {
      grant,
      events: upcomingEvents,
    };
  });
}
