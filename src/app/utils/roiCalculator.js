/**
 * ROI Calculation Engine
 * Calculates final ROI values and prepares PandaDoc tokens
 */

/**
 * Calculate ROI breakdown and total monthly ROI
 * @param {object} roiMetrics - Hours from getROIMetrics
 * @param {number} yearlyTurnover - p_3pl_yearly_turnover value
 * @returns {object} Complete ROI breakdown and tokens
 */
function calculateROI(roiMetrics, yearlyTurnover) {
  const { analyticsHours, billingHours, ticketsHours } = roiMetrics;

  // ROI Line 1 (Billing): Billing hours * $30
  const billingValue = billingHours * 30;

  // ROI Line 2 (Analytics): Analytics hours * $25
  const analyticsValue = analyticsHours * 25;

  // ROI Line 3 (Tickets): Tickets hours * $25
  const ticketsValue = ticketsHours * 25;

  // ROI Line 4 (Leakage): (yearly_turnover * 3%) / 12
  const leakageValue = (yearlyTurnover * 0.03) / 12;

  // Total Monthly ROI = Sum of all values
  const totalMonthlyROI = billingValue + analyticsValue + ticketsValue + leakageValue;

  return {
    billing: {
      hours: billingHours,
      value: billingValue
    },
    analytics: {
      hours: analyticsHours,
      value: analyticsValue
    },
    tickets: {
      hours: ticketsHours,
      value: ticketsValue
    },
    leakage: {
      value: leakageValue
    },
    totalMonthlyROI: totalMonthlyROI
  };
}

/**
 * Prepare PandaDoc tokens from pricing and ROI data
 * @param {object} pricing - Result from getSubscriptionPrice
 * @param {object} roi - Result from calculateROI
 * @returns {object} PandaDoc token map
 */
function preparePandaDocTokens(pricing, roi) {
  return {
    // Pricing tokens
    Original_Price: pricing.originalPrice,
    Discount_Price: pricing.discountedPrice,
    Discount_Percent: pricing.discountPercent,

    // ROI Line items
    ROI_Billing_Hours: roi.billing.hours,
    ROI_Billing_Value: roi.billing.value,
    ROI_Analytics_Hours: roi.analytics.hours,
    ROI_Analytics_Value: roi.analytics.value,
    ROI_Tickets_Hours: roi.tickets.hours,
    ROI_Tickets_Value: roi.tickets.value,
    ROI_Leakage_Value: roi.leakage.value,

    // Summary
    Total_Monthly_ROI: roi.totalMonthlyROI
  };
}

module.exports = { calculateROI, preparePandaDocTokens };
