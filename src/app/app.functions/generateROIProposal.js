/**
 * HubSpot Serverless Function: Generate ROI Proposal
 *
 * Fetches deal properties, runs pricing & ROI engines,
 * creates a HubSpot Quote with line items, and returns the quote link
 */

const hubspot = require('@hubspot/api-client');

// ============================================================================
// ENGINE A: Subscription Pricing Matrix
// ============================================================================
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

function getSubscriptionPrice(volume) {
  if (volume >= 700000) return null;
  for (const tier of PRICING_TIERS) {
    if (volume <= tier.volumeUpTo) {
      return {
        originalPrice: tier.originalPrice,
        discountedPrice: tier.discountedPrice,
        discountPercent: tier.discountPercent
      };
    }
  }
  const highestTier = PRICING_TIERS[PRICING_TIERS.length - 1];
  return {
    originalPrice: highestTier.originalPrice,
    discountedPrice: highestTier.discountedPrice,
    discountPercent: highestTier.discountPercent
  };
}

// ============================================================================
// ENGINE B: Granular ROI Matrix
// ============================================================================
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

function getROIMetrics(volume) {
  if (volume >= 700000) return null;
  let matchedTier = ROI_TIERS[0];
  for (const tier of ROI_TIERS) {
    if (volume >= tier.from) {
      matchedTier = tier;
    } else {
      break;
    }
  }
  return {
    analyticsHours: matchedTier.analytics,
    billingHours: matchedTier.billing,
    ticketsHours: matchedTier.tickets
  };
}

// ============================================================================
// ROI Calculation Engine
// ============================================================================
function calculateROI(roiMetrics, yearlyTurnover) {
  const { analyticsHours, billingHours, ticketsHours } = roiMetrics;

  const billingValue = billingHours * 30;
  const analyticsValue = analyticsHours * 25;
  const ticketsValue = ticketsHours * 25;
  const leakageValue = (yearlyTurnover * 0.03) / 12;
  const totalMonthlyROI = billingValue + analyticsValue + ticketsValue + leakageValue;

  return {
    billing: { hours: billingHours, value: billingValue },
    analytics: { hours: analyticsHours, value: analyticsValue },
    tickets: { hours: ticketsHours, value: ticketsValue },
    leakage: { value: leakageValue },
    totalMonthlyROI: totalMonthlyROI
  };
}

// ============================================================================
// Main Serverless Function
// ============================================================================
exports.main = async (context = {}) => {
  const { dealId, checkPresentationLink } = context.parameters;

  // Initialize HubSpot client with access token from secrets
  const hubspotClient = new hubspot.Client({
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN
  });

  try {
    // If this is just a check for presentation_link, return it quickly
    if (checkPresentationLink) {
      // Fetch the doc_link_roi property (lowercase!)
      console.log('🔍 Fetching doc_link_roi for deal:', dealId);
      const deal = await hubspotClient.crm.deals.basicApi.getById(dealId, ['doc_link_roi']);

      console.log('📋 Full deal properties:', JSON.stringify(deal.properties, null, 2));

      const presentationLink = deal.properties.doc_link_roi || null;

      console.log('🔗 doc_link_roi value:', presentationLink);
      console.log('🔗 Type:', typeof presentationLink);
      console.log('🔗 Is null?:', presentationLink === null);
      console.log('🔗 Is empty string?:', presentationLink === '');

      return {
        success: true,
        presentationLink: presentationLink
      };
    }

    // Step 1: Fetch deal properties
    // Note: HubSpot's standard deal name property is 'dealname'
    const deal = await hubspotClient.crm.deals.basicApi.getById(dealId, [
      'total_ava_monthly_orders_b2bb2c',
      'p_3pl_yearly_turnover',
      'dealname',
      'amount',
      'hs_object_id'
    ]);

    const monthlyOrderVolume = parseFloat(deal.properties.total_ava_monthly_orders_b2bb2c) || 0;
    const yearlyTurnover = parseFloat(deal.properties.p_3pl_yearly_turnover) || 0;

    // Try multiple potential deal name properties
    const dealName = deal.properties.dealname ||
                     deal.properties.name ||
                     deal.properties.deal_name ||
                     `Deal ${dealId}`;

    console.log('Deal ID:', dealId);
    console.log('Deal properties:', JSON.stringify(deal.properties, null, 2));
    console.log('Deal name extracted:', dealName);
    console.log('dealname property:', deal.properties.dealname);
    console.log('name property:', deal.properties.name);

    // Step 1.5: Track missing fields but continue with calculation
    const missingFields = [];
    const warnings = [];

    if (!deal.properties.total_ava_monthly_orders_b2bb2c || monthlyOrderVolume === 0) {
      missingFields.push('Total Monthly Orders (B2B/B2C)');
      warnings.push('Total Monthly Orders is missing - using 0 for calculations');
    }

    if (!deal.properties.p_3pl_yearly_turnover || yearlyTurnover === 0) {
      missingFields.push('3PL Yearly Turnover');
      warnings.push('3PL Yearly Turnover is missing - some ROI calculations may be affected');
    }

    // Step 2: Check for enterprise volume (>= 700,000)
    if (monthlyOrderVolume >= 700000) {
      return {
        success: false,
        error: 'ENTERPRISE_VOLUME',
        message: 'Volume >= 700,000 requires a manual enterprise quote. Please contact the sales team.',
        volume: monthlyOrderVolume
      };
    }

    // Step 3: Run Engine A - Subscription Pricing
    const pricing = getSubscriptionPrice(monthlyOrderVolume);

    if (!pricing) {
      return {
        success: false,
        error: 'PRICING_ERROR',
        message: 'Unable to determine pricing for this volume.'
      };
    }

    // Step 4: Run Engine B - ROI Metrics
    const roiMetrics = getROIMetrics(monthlyOrderVolume);

    if (!roiMetrics) {
      return {
        success: false,
        error: 'ROI_ERROR',
        message: 'Unable to determine ROI metrics for this volume.'
      };
    }

    // Step 5: Calculate final ROI values
    const roi = calculateROI(roiMetrics, yearlyTurnover);

    // Step 6-8: Return success with calculated data
    // Note: Quote creation will be added in next iteration
    return {
      success: true,
      quoteUrl: null,
      quoteId: null,
      dealName: dealName,
      pricing: pricing,
      roi: roi,
      message: 'ROI calculated successfully! Quote creation coming soon.',
      warnings: warnings.length > 0 ? warnings : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined
    };

  } catch (error) {
    console.error('Error generating ROI proposal:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: `${error.message || 'An unexpected error occurred'} - ${error.stack ? error.stack.split('\n')[0] : ''}`
    };
  }
};

/**
 * Ensure required products exist in HubSpot
 */
async function ensureProductsExist(context, pricing, roi) {
  const products = {};

  const subscriptionProduct = await findOrCreateProduct(
    context,
    'Subscription Service',
    'SUBSCRIPTION',
    pricing.discountedPrice
  );
  products.subscription = subscriptionProduct.id;

  const roiBillingProduct = await findOrCreateProduct(
    context,
    'ROI: Billing Automation',
    'ROI_BILLING',
    0
  );
  products.roiBilling = roiBillingProduct.id;

  const roiAnalyticsProduct = await findOrCreateProduct(
    context,
    'ROI: Analytics Savings',
    'ROI_ANALYTICS',
    0
  );
  products.roiAnalytics = roiAnalyticsProduct.id;

  const roiTicketsProduct = await findOrCreateProduct(
    context,
    'ROI: Ticket Reduction',
    'ROI_TICKETS',
    0
  );
  products.roiTickets = roiTicketsProduct.id;

  const roiLeakageProduct = await findOrCreateProduct(
    context,
    'ROI: Leakage Prevention',
    'ROI_LEAKAGE',
    0
  );
  products.roiLeakage = roiLeakageProduct.id;

  return products;
}

/**
 * Find or create a product in HubSpot
 */
async function findOrCreateProduct(hubspotClient, name, sku, price) {
  try {
    const searchResults = await hubspotClient.crm.products.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'hs_sku',
          operator: 'EQ',
          value: sku
        }]
      }],
      limit: 1
    });

    if (searchResults.results && searchResults.results.length > 0) {
      return searchResults.results[0];
    }

    const newProduct = await hubspotClient.crm.products.basicApi.create({
      properties: {
        name: name,
        hs_sku: sku,
        price: price,
        description: `Auto-generated ROI product for ${name}`
      }
    });

    return newProduct;
  } catch (error) {
    console.error(`Error finding/creating product ${sku}:`, error);
    throw error;
  }
}

/**
 * Create HubSpot Quote with line items
 */
async function createHubSpotQuote(hubspotClient, dealId, dealName, products, pricing, roi) {
  const quote = await hubspotClient.crm.quotes.basicApi.create({
    properties: {
      hs_title: `ROI Proposal - ${dealName}`,
      hs_expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(),
      hs_status: 'DRAFT',
      hs_custom_pricing_notes: buildPricingNotes(pricing, roi)
    },
    associations: [
      {
        to: { id: dealId },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 64
          }
        ]
      }
    ]
  });

  await addLineItems(hubspotClient, quote.id, products, pricing, roi);

  return quote;
}

/**
 * Add line items to the quote
 */
async function addLineItems(hubspotClient, quoteId, products, pricing, roi) {
  await hubspotClient.crm.lineItems.basicApi.create({
    properties: {
      hs_product_id: products.subscription,
      name: `Subscription (Volume: ${pricing.volume || 'Standard'})`,
      quantity: 1,
      price: pricing.discountedPrice,
      hs_discount_percentage: pricing.discountPercent,
      description: `Original Price: $${pricing.originalPrice} | Discount: ${pricing.discountPercent}%`
    },
    associations: [
      {
        to: { id: quoteId },
        types: [{
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 67
        }]
      }
    ]
  });

  const roiLineItems = [
    {
      productId: products.roiBilling,
      name: 'Monthly ROI: Billing Automation',
      description: `${roi.billing.hours} hours saved × $30/hr`,
      value: roi.billing.value
    },
    {
      productId: products.roiAnalytics,
      name: 'Monthly ROI: Analytics Savings',
      description: `${roi.analytics.hours} hours saved × $25/hr`,
      value: roi.analytics.value
    },
    {
      productId: products.roiTickets,
      name: 'Monthly ROI: Ticket Reduction',
      description: `${roi.tickets.hours} hours saved × $25/hr`,
      value: roi.tickets.value
    },
    {
      productId: products.roiLeakage,
      name: 'Monthly ROI: Leakage Prevention',
      description: `3% of yearly turnover / 12 months`,
      value: roi.leakage.value
    }
  ];

  for (const item of roiLineItems) {
    await hubspotClient.crm.lineItems.basicApi.create({
      properties: {
        hs_product_id: item.productId,
        name: item.name,
        quantity: 1,
        price: 0,
        description: `${item.description} = $${item.value.toFixed(2)}`
      },
      associations: [
        {
          to: { id: quoteId },
          types: [{
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 67
          }]
        }
      ]
    });
  }
}

/**
 * Build pricing notes for the quote
 */
function buildPricingNotes(pricing, roi) {
  return `
PRICING SUMMARY
===============
Original Price: $${pricing.originalPrice.toLocaleString()}
Discounted Price: $${pricing.discountedPrice.toLocaleString()}
Discount: ${pricing.discountPercent}%

MONTHLY ROI BREAKDOWN
=====================
Billing Automation: $${roi.billing.value.toFixed(2)} (${roi.billing.hours}h × $30)
Analytics Savings: $${roi.analytics.value.toFixed(2)} (${roi.analytics.hours}h × $25)
Ticket Reduction: $${roi.tickets.value.toFixed(2)} (${roi.tickets.hours}h × $25)
Leakage Prevention: $${roi.leakage.value.toFixed(2)}

TOTAL MONTHLY ROI: $${roi.totalMonthlyROI.toFixed(2)}
ROI Payback Period: ${(pricing.discountedPrice / roi.totalMonthlyROI).toFixed(1)} months
  `.trim();
}
