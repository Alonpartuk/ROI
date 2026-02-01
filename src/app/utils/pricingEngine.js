/**
 * ENGINE A: Subscription Pricing Matrix
 * Returns pricing details based on monthly order volume
 */

const PRICING_TIERS = [
  { volumeUpTo: 9999, originalPrice: 2000, discountedPrice: 1000, discountPercent: 50 },
  { volumeUpTo: 29999, originalPrice: 3000, discountedPrice: 2000, discountPercent: 33 },
  { volumeUpTo: 49999, originalPrice: 3500, discountedPrice: 2500, discountPercent: 30 },
  { volumeUpTo: 99999, originalPrice: 4500, discountedPrice: 3000, discountPercent: 33 },
  { volumeUpTo: 199999, originalPrice: 5000, discountedPrice: 3500, discountPercent: 30 },
  { volumeUpTo: 299999, originalPrice: 5500, discountedPrice: 4000, discountPercent: 27 },
  { volumeUpTo: 499999, originalPrice: 7000, discountedPrice: 5000, discountPercent: 29 },
  { volumeUpTo: 699999, originalPrice: 8000, discountedPrice: 6000, discountPercent: 25 }
];

/**
 * Get subscription pricing based on monthly order volume
 * @param {number} volume - Monthly order volume
 * @returns {object} Pricing details or null if enterprise volume
 */
function getSubscriptionPrice(volume) {
  // Handle enterprise volumes (>= 700,000)
  if (volume >= 700000) {
    return null; // Indicates manual enterprise quote needed
  }

  // Find the appropriate tier
  for (const tier of PRICING_TIERS) {
    if (volume <= tier.volumeUpTo) {
      return {
        originalPrice: tier.originalPrice,
        discountedPrice: tier.discountedPrice,
        discountPercent: tier.discountPercent
      };
    }
  }

  // Fallback to highest tier if volume is between 699,999 and 700,000
  const highestTier = PRICING_TIERS[PRICING_TIERS.length - 1];
  return {
    originalPrice: highestTier.originalPrice,
    discountedPrice: highestTier.discountedPrice,
    discountPercent: highestTier.discountPercent
  };
}

module.exports = { getSubscriptionPrice };
