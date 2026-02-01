# HubSpot ROI Quote Engine

**100% FREE** - Automated ROI proposal generator using HubSpot's native Quote system. No external API costs!

## Why HubSpot Quotes?

✅ **Completely Free** - No PandaDoc or external API costs
✅ **Native Integration** - Built into HubSpot Sales Hub Enterprise
✅ **E-Signature** - Built-in electronic signature capability
✅ **Professional PDFs** - Auto-generated branded quotes
✅ **Track Views** - See when prospects open quotes
✅ **CRM Integration** - Quotes automatically linked to Deals
✅ **Line Items** - Detailed pricing with ROI breakdown

## Features

- **Engine A: Subscription Pricing Matrix** - Automatic pricing lookup based on monthly order volume (8 tiers)
- **Engine B: Granular ROI Matrix** - Detailed ROI calculations with hourly breakdowns (38 tiers)
- **HubSpot Quote Creation** - Automatic quote generation with line items
- **UI Extension** - One-click quote generation from HubSpot Deal records
- **Enterprise Handling** - Special alerts for volumes >= 700,000 requiring manual quotes

## Architecture

```
src/
├── app/
│   ├── extensions/
│   │   └── ROIProposalCard.jsx       # UI Extension for Deal object
│   ├── functions/
│   │   └── generateROIProposal.js    # Serverless function (creates HubSpot Quote)
│   └── utils/
│       ├── pricingEngine.js          # Engine A: Pricing lookup
│       ├── roiEngine.js              # Engine B: ROI metrics lookup
│       └── roiCalculator.js          # ROI calculations
```

## Prerequisites

1. **HubSpot Account**
   - Sales Hub Enterprise (includes Quotes feature)
   - Access to UI Extensions and Serverless Functions

2. **Required Deal Properties**
   - `monthly_order_volume` (Number)
   - `p_3pl_yearly_turnover` (Number)

3. **HubSpot Objects** (Auto-created by the function)
   - Products (5 products will be auto-generated)
   - Quotes
   - Line Items

## Installation

### 1. Install HubSpot CLI

```bash
npm install -g @hubspot/cli
```

### 2. Authenticate with HubSpot

```bash
hs auth
```

### 3. Install Dependencies

```bash
cd c:\Users\AlonPartuk\ROI
npm install
```

### 4. Deploy to HubSpot

```bash
hs project upload
```

That's it! No API keys, no secrets, no external services required.

## How It Works

### 1. User Flow

1. Salesperson opens a Deal record in HubSpot
2. Ensures `monthly_order_volume` and `p_3pl_yearly_turnover` are filled
3. Clicks "Generate ROI Quote" button
4. System processes (3-5 seconds)
5. HubSpot Quote is created and linked to the Deal
6. User clicks link to open Quote in HubSpot
7. Quote can be sent to customer with e-signature

### 2. Behind the Scenes

```
Deal Record
    ↓
UI Extension (Button Click)
    ↓
Serverless Function:
    ├─ Fetch Deal Properties
    ├─ Run Engine A (Pricing Lookup)
    ├─ Run Engine B (ROI Metrics)
    ├─ Calculate Final ROI Values
    ├─ Find/Create Products
    ├─ Create HubSpot Quote
    └─ Add Line Items:
        ├─ Subscription (with discount)
        ├─ ROI: Billing Automation
        ├─ ROI: Analytics Savings
        ├─ ROI: Ticket Reduction
        └─ ROI: Leakage Prevention
    ↓
Quote Created!
    ↓
Return Quote Link to UI
```

### 3. Quote Structure

The generated HubSpot Quote includes:

**Main Line Item:**
- **Subscription Service**
  - Quantity: 1
  - Price: ${discountedPrice} (e.g., $2,500)
  - Discount: {discountPercent}% (e.g., 30%)
  - Description shows original price

**ROI Line Items** (Informational, $0 price):
- **Monthly ROI: Billing Automation**
  - Description: "70 hours saved × $30/hr = $2,100"

- **Monthly ROI: Analytics Savings**
  - Description: "25 hours saved × $25/hr = $625"

- **Monthly ROI: Ticket Reduction**
  - Description: "17.5 hours saved × $25/hr = $437.50"

- **Monthly ROI: Leakage Prevention**
  - Description: "3% of yearly turnover / 12 months = $2,500"

**Quote Notes Section:**
```
PRICING SUMMARY
===============
Original Price: $3,500
Discounted Price: $2,500
Discount: 30%

MONTHLY ROI BREAKDOWN
=====================
Billing Automation: $2,100 (70h × $30)
Analytics Savings: $625 (25h × $25)
Ticket Reduction: $437.50 (17.5h × $25)
Leakage Prevention: $2,500

TOTAL MONTHLY ROI: $5,662.50
ROI Payback Period: 0.4 months
```

## Engine A: Pricing Matrix

| Volume Up To | Original Price | Discounted Price | Discount % |
|--------------|----------------|------------------|------------|
| 9,999        | $2,000         | $1,000           | 50%        |
| 29,999       | $3,000         | $2,000           | 33%        |
| 49,999       | $3,500         | $2,500           | 30%        |
| 99,999       | $4,500         | $3,000           | 33%        |
| 199,999      | $5,000         | $3,500           | 30%        |
| 299,999      | $5,500         | $4,000           | 27%        |
| 499,999      | $7,000         | $5,000           | 29%        |
| 699,999      | $8,000         | $6,000           | 25%        |

## Engine B: ROI Calculations

### Formula

1. **Billing ROI** = Billing Hours × $30
2. **Analytics ROI** = Analytics Hours × $25
3. **Tickets ROI** = Tickets Hours × $25
4. **Leakage Prevention** = (Yearly Turnover × 3%) ÷ 12
5. **Total Monthly ROI** = Sum of all above

See [roiEngine.js](src/app/utils/roiEngine.js) for the complete 38-tier hours lookup table.

## Products Auto-Generation

The system automatically creates/finds these products in HubSpot:

1. **Subscription Service** (SKU: SUBSCRIPTION)
2. **ROI: Billing Automation** (SKU: ROI_BILLING)
3. **ROI: Analytics Savings** (SKU: ROI_ANALYTICS)
4. **ROI: Ticket Reduction** (SKU: ROI_TICKETS)
5. **ROI: Leakage Prevention** (SKU: ROI_LEAKAGE)

Products are created once and reused for all quotes.

## Usage Example

### Test Scenario

**Deal Properties:**
- `monthly_order_volume`: 50,000
- `p_3pl_yearly_turnover`: 1,000,000

**Expected Results:**
- **Pricing Tier**: 30,000-49,999
  - Original: $3,500
  - Discounted: $2,500
  - Discount: 30%

- **ROI Metrics**:
  - Billing: 70 hours → $2,100
  - Analytics: 25 hours → $625
  - Tickets: 17.5 hours → $437.50
  - Leakage: $2,500
  - **Total Monthly ROI**: $5,662.50
  - **Payback Period**: 0.4 months

## Customization

### Modify Pricing Tiers

Edit [pricingEngine.js](src/app/utils/pricingEngine.js):

```javascript
const PRICING_TIERS = [
  { volumeUpTo: 9999, originalPrice: 2000, discountedPrice: 1000, discountPercent: 50 },
  // Add/modify tiers here
];
```

### Modify ROI Hours Lookup

Edit [roiEngine.js](src/app/utils/roiEngine.js):

```javascript
const ROI_TIERS = [
  { from: 0, analytics: 10, billing: 35, tickets: 3.5 },
  // Add/modify tiers here
];
```

### Modify ROI Calculations

Edit [roiCalculator.js](src/app/utils/roiCalculator.js):

```javascript
const billingValue = billingHours * 30;  // Change rate here
const analyticsValue = analyticsHours * 25;  // Change rate here
```

## Quote Templates

You can customize how quotes appear by:

1. Go to HubSpot Settings → Objects → Quotes
2. Create a Quote Template
3. Customize branding, colors, logos
4. Set as default template

The system will use your default quote template automatically.

## Troubleshooting

### "Unable to create quote"

**Solution:**
1. Verify you have Sales Hub Enterprise
2. Check Quotes feature is enabled
3. Ensure proper scopes in `hubspot.config.yml`

### Products not appearing

**Solution:**
1. Check Products library in HubSpot
2. Verify SKUs: SUBSCRIPTION, ROI_BILLING, ROI_ANALYTICS, ROI_TICKETS, ROI_LEAKAGE
3. Products auto-create on first run

### Quote not linked to Deal

**Solution:**
1. Check Deal ID is valid
2. Verify association permissions
3. Review function logs

## Benefits Over PandaDoc

| Feature | HubSpot Quotes | PandaDoc API |
|---------|----------------|--------------|
| **Cost** | FREE ✅ | $$$$ ❌ |
| **E-Signature** | Built-in ✅ | Yes ✅ |
| **Track Views** | Built-in ✅ | Yes ✅ |
| **CRM Integration** | Native ✅ | Requires setup ⚠️ |
| **Branding** | Customizable ✅ | Customizable ✅ |
| **Line Items** | Native ✅ | Token-based ⚠️ |
| **Setup Complexity** | Low ✅ | Medium ⚠️ |
| **API Limits** | HubSpot limits | PandaDoc limits |
| **External Dependency** | None ✅ | PandaDoc service ❌ |

## Support

For issues:
1. Check HubSpot developer logs: Settings → Integrations → Developer Projects
2. Review serverless function logs
3. Check browser console for UI Extension errors

## License

Proprietary - Internal Use Only
