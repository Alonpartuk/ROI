/**
 * ENGINE B: Granular ROI Matrix
 * Returns ROI metrics (Analytics, Billing, Tickets hours) based on volume
 */

const ROI_TIERS = [
  { from: 0, analytics: 10, billing: 35, tickets: 3.5 },
  { from: 10000, analytics: 10, billing: 35, tickets: 3.5 },
  { from: 29999, analytics: 10, billing: 35, tickets: 10.5 },
  { from: 30000, analytics: 15, billing: 70, tickets: 10.5 },
  { from: 40000, analytics: 15, billing: 70, tickets: 14.0 },
  { from: 49999, analytics: 15, billing: 70, tickets: 17.5 },
  { from: 50000, analytics: 25, billing: 70, tickets: 17.5 },
  { from: 60000, analytics: 25, billing: 70, tickets: 21.0 },
  { from: 70000, analytics: 25, billing: 105, tickets: 24.5 },
  { from: 80000, analytics: 25, billing: 105, tickets: 28.0 },
  { from: 90000, analytics: 25, billing: 105, tickets: 31.5 },
  { from: 99999, analytics: 25, billing: 105, tickets: 35.0 },
  { from: 100000, analytics: 25, billing: 105, tickets: 35.0 },
  { from: 110000, analytics: 25, billing: 105, tickets: 38.5 },
  { from: 120000, analytics: 25, billing: 105, tickets: 42.0 },
  { from: 130000, analytics: 25, billing: 105, tickets: 45.5 },
  { from: 140000, analytics: 25, billing: 105, tickets: 49.0 },
  { from: 150000, analytics: 25, billing: 105, tickets: 52.5 },
  { from: 160000, analytics: 25, billing: 105, tickets: 56.0 },
  { from: 170000, analytics: 25, billing: 105, tickets: 59.5 },
  { from: 180000, analytics: 25, billing: 105, tickets: 63.0 },
  { from: 190000, analytics: 25, billing: 105, tickets: 66.5 },
  { from: 199999, analytics: 25, billing: 105, tickets: 70.0 },
  { from: 200000, analytics: 35, billing: 140, tickets: 70.0 },
  { from: 210000, analytics: 35, billing: 140, tickets: 73.5 },
  { from: 220000, analytics: 35, billing: 140, tickets: 77.0 },
  { from: 230000, analytics: 35, billing: 140, tickets: 80.5 },
  { from: 240000, analytics: 35, billing: 140, tickets: 84.0 },
  { from: 250000, analytics: 35, billing: 140, tickets: 87.5 },
  { from: 260000, analytics: 35, billing: 140, tickets: 91.0 },
  { from: 270000, analytics: 35, billing: 140, tickets: 94.5 },
  { from: 280000, analytics: 35, billing: 140, tickets: 98.0 },
  { from: 290000, analytics: 35, billing: 140, tickets: 101.5 },
  { from: 299999, analytics: 35, billing: 140, tickets: 105.0 },
  { from: 300000, analytics: 35, billing: 210, tickets: 105.0 },
  { from: 400000, analytics: 35, billing: 245, tickets: 140.0 },
  { from: 500000, analytics: 35, billing: 245, tickets: 175.0 },
  { from: 699999, analytics: 35, billing: 245, tickets: 245.0 }
];

/**
 * Get ROI metrics based on monthly order volume
 * Finds the matching row where volume >= From
 * @param {number} volume - Monthly order volume
 * @returns {object} ROI metrics (analytics, billing, tickets hours)
 */
function getROIMetrics(volume) {
  // Handle enterprise volumes (>= 700,000)
  if (volume >= 700000) {
    return null; // Indicates manual enterprise quote needed
  }

  // Find the appropriate tier by iterating in reverse
  // to get the highest tier where volume >= from
  let matchedTier = ROI_TIERS[0]; // Default to first tier

  for (const tier of ROI_TIERS) {
    if (volume >= tier.from) {
      matchedTier = tier;
    } else {
      break; // Stop when we find a tier where volume < from
    }
  }

  return {
    analyticsHours: matchedTier.analytics,
    billingHours: matchedTier.billing,
    ticketsHours: matchedTier.tickets
  };
}

module.exports = { getROIMetrics };
