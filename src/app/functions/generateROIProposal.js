const { getSubscriptionPrice } = require('../utils/pricingEngine');
const { getROIMetrics } = require('../utils/roiEngine');
const { calculateROI } = require('../utils/roiCalculator');

/**
 * HubSpot Serverless Function: Generate ROI Proposal
 *
 * Fetches deal properties, runs pricing & ROI engines,
 * creates a HubSpot Quote with line items, and returns the quote link
 */
exports.main = async (context = {}, sendResponse) => {
  const { dealId } = context.parameters;
  const hubspotClient = context.hubspot;

  try {
    // Step 1: Fetch deal properties from HubSpot
    const deal = await hubspotClient.crm.deals.basicApi.getById(dealId, [
      'monthly_order_volume',
      'p_3pl_yearly_turnover',
      'dealname',
      'amount'
    ]);

    const monthlyOrderVolume = parseFloat(deal.properties.monthly_order_volume) || 0;
    const yearlyTurnover = parseFloat(deal.properties.p_3pl_yearly_turnover) || 0;
    const dealName = deal.properties.dealname || 'ROI Proposal';

    // Step 2: Check for enterprise volume (>= 700,000)
    if (monthlyOrderVolume >= 700000) {
      sendResponse({
        success: false,
        error: 'ENTERPRISE_VOLUME',
        message: 'Volume >= 700,000 requires a manual enterprise quote. Please contact the sales team.',
        volume: monthlyOrderVolume
      });
      return;
    }

    // Step 3: Run Engine A - Subscription Pricing
    const pricing = getSubscriptionPrice(monthlyOrderVolume);

    if (!pricing) {
      sendResponse({
        success: false,
        error: 'PRICING_ERROR',
        message: 'Unable to determine pricing for this volume.'
      });
      return;
    }

    // Step 4: Run Engine B - ROI Metrics
    const roiMetrics = getROIMetrics(monthlyOrderVolume);

    if (!roiMetrics) {
      sendResponse({
        success: false,
        error: 'ROI_ERROR',
        message: 'Unable to determine ROI metrics for this volume.'
      });
      return;
    }

    // Step 5: Calculate final ROI values
    const roi = calculateROI(roiMetrics, yearlyTurnover);

    // Step 6: Get or create products for line items
    const products = await ensureProductsExist(hubspotClient, pricing, roi);

    // Step 7: Create HubSpot Quote with line items
    const quote = await createHubSpotQuote(
      hubspotClient,
      dealId,
      dealName,
      products,
      pricing,
      roi
    );

    // Step 8: Return success with Quote link
    sendResponse({
      success: true,
      quoteUrl: `https://app.hubspot.com/contacts/${context.accountId}/quote/${quote.id}`,
      quoteId: quote.id,
      pricing: pricing,
      roi: roi
    });

  } catch (error) {
    console.error('Error generating ROI proposal:', error);
    sendResponse({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    });
  }
};

/**
 * Ensure required products exist in HubSpot
 * @param {object} hubspotClient - HubSpot API client
 * @param {object} pricing - Pricing data
 * @param {object} roi - ROI data
 * @returns {Promise<object>} Product IDs
 */
async function ensureProductsExist(hubspotClient, pricing, roi) {
  const products = {};

  // Subscription Product
  const subscriptionProduct = await findOrCreateProduct(
    hubspotClient,
    'Subscription Service',
    'SUBSCRIPTION',
    pricing.discountedPrice
  );
  products.subscription = subscriptionProduct.id;

  // ROI Line Items (for display purposes, $0 price)
  const roiBillingProduct = await findOrCreateProduct(
    hubspotClient,
    'ROI: Billing Automation',
    'ROI_BILLING',
    0
  );
  products.roiBilling = roiBillingProduct.id;

  const roiAnalyticsProduct = await findOrCreateProduct(
    hubspotClient,
    'ROI: Analytics Savings',
    'ROI_ANALYTICS',
    0
  );
  products.roiAnalytics = roiAnalyticsProduct.id;

  const roiTicketsProduct = await findOrCreateProduct(
    hubspotClient,
    'ROI: Ticket Reduction',
    'ROI_TICKETS',
    0
  );
  products.roiTickets = roiTicketsProduct.id;

  const roiLeakageProduct = await findOrCreateProduct(
    hubspotClient,
    'ROI: Leakage Prevention',
    'ROI_LEAKAGE',
    0
  );
  products.roiLeakage = roiLeakageProduct.id;

  return products;
}

/**
 * Find or create a product in HubSpot
 * @param {object} hubspotClient - HubSpot API client
 * @param {string} name - Product name
 * @param {string} sku - Product SKU
 * @param {number} price - Product price
 * @returns {Promise<object>} Product object
 */
async function findOrCreateProduct(hubspotClient, name, sku, price) {
  try {
    // Search for existing product by SKU
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

    // Create new product if not found
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
 * @param {object} hubspotClient - HubSpot API client
 * @param {string} dealId - Deal ID
 * @param {string} dealName - Deal name
 * @param {object} products - Product IDs
 * @param {object} pricing - Pricing data
 * @param {object} roi - ROI data
 * @returns {Promise<object>} Quote object
 */
async function createHubSpotQuote(hubspotClient, dealId, dealName, products, pricing, roi) {
  // Create the quote
  const quote = await hubspotClient.crm.quotes.basicApi.create({
    properties: {
      hs_title: `ROI Proposal - ${dealName}`,
      hs_expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(), // 30 days
      hs_status: 'DRAFT',
      hs_custom_pricing_notes: buildPricingNotes(pricing, roi)
    },
    associations: [
      {
        to: { id: dealId },
        types: [
          {
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 64 // Quote to Deal
          }
        ]
      }
    ]
  });

  // Add line items to quote
  await addLineItems(hubspotClient, quote.id, products, pricing, roi);

  return quote;
}

/**
 * Add line items to the quote
 * @param {object} hubspotClient - HubSpot API client
 * @param {string} quoteId - Quote ID
 * @param {object} products - Product IDs
 * @param {object} pricing - Pricing data
 * @param {object} roi - ROI data
 */
async function addLineItems(hubspotClient, quoteId, products, pricing, roi) {
  // Main subscription line item
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
          associationTypeId: 67 // Line Item to Quote
        }]
      }
    ]
  });

  // ROI Line Items (for informational display)
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
        price: 0, // Display only, not charged
        description: `${item.description} = $${item.value.toFixed(2)}`
      },
      associations: [
        {
          to: { id: quoteId },
          types: [{
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 67 // Line Item to Quote
          }]
        }
      ]
    });
  }
}

/**
 * Build pricing notes for the quote
 * @param {object} pricing - Pricing data
 * @param {object} roi - ROI data
 * @returns {string} Formatted pricing notes
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
