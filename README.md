# HubSpot-to-PandaDoc ROI Engine

Automated ROI proposal generator that integrates HubSpot Sales Hub with PandaDoc to create data-driven proposals with subscription pricing and ROI calculations.

## Features

- **Engine A: Subscription Pricing Matrix** - Automatic pricing lookup based on monthly order volume
- **Engine B: Granular ROI Matrix** - Detailed ROI calculations with hourly breakdowns
- **PandaDoc Integration** - Automatic draft document creation with populated tokens
- **UI Extension** - One-click proposal generation from HubSpot Deal records
- **Enterprise Handling** - Special alerts for volumes >= 700,000 requiring manual quotes

## Architecture

```
src/
├── app/
│   ├── extensions/
│   │   └── ROIProposalCard.jsx       # UI Extension for Deal object
│   ├── functions/
│   │   └── generateROIProposal.js    # Serverless function
│   └── utils/
│       ├── pricingEngine.js          # Engine A: Pricing lookup
│       ├── roiEngine.js              # Engine B: ROI metrics lookup
│       └── roiCalculator.js          # ROI calculations & token prep
```

## Prerequisites

1. **HubSpot Account**
   - Sales Hub Enterprise
   - Access to UI Extensions and Serverless Functions

2. **PandaDoc Account**
   - API key with document creation permissions
   - Template created with the following tokens configured

3. **Required Deal Properties**
   - `monthly_order_volume` (Number)
   - `p_3pl_yearly_turnover` (Number)

## PandaDoc Template Tokens

Your PandaDoc template must include these tokens:

### Pricing Tokens
- `{{Original_Price}}` - Original subscription price
- `{{Discount_Price}}` - Discounted subscription price
- `{{Discount_Percent}}` - Discount percentage

### ROI Tokens
- `{{ROI_Billing_Hours}}` - Billing hours saved
- `{{ROI_Billing_Value}}` - Billing value ($)
- `{{ROI_Analytics_Hours}}` - Analytics hours saved
- `{{ROI_Analytics_Value}}` - Analytics value ($)
- `{{ROI_Tickets_Hours}}` - Tickets hours saved
- `{{ROI_Tickets_Value}}` - Tickets value ($)
- `{{ROI_Leakage_Value}}` - Leakage prevention value ($)
- `{{Total_Monthly_ROI}}` - Total monthly ROI ($)

## Installation

### 1. Install HubSpot CLI

```bash
npm install -g @hubspot/cli
```

### 2. Authenticate with HubSpot

```bash
hs auth
```

### 3. Clone and Install Dependencies

```bash
npm install
```

### 4. Configure Secrets

Set your PandaDoc API key as a HubSpot secret:

```bash
hs secrets add PANDADOC_API_KEY
```

When prompted, enter your PandaDoc API key.

### 5. Update Template ID

Edit `src/app/functions/generateROIProposal.js` and replace:

```javascript
template_uuid: process.env.PANDADOC_TEMPLATE_ID || 'YOUR_TEMPLATE_ID_HERE'
```

Or add `PANDADOC_TEMPLATE_ID` to your HubSpot secrets:

```bash
hs secrets add PANDADOC_TEMPLATE_ID
```

### 6. Deploy to HubSpot

```bash
hs project upload
```

## Usage

### For Sales Team

1. Navigate to any Deal record in HubSpot
2. Ensure `monthly_order_volume` and `p_3pl_yearly_turnover` are populated
3. Find the "ROI Proposal Generator" card in the right sidebar
4. Click **"Generate ROI Proposal"**
5. Wait for processing (typically 3-5 seconds)
6. Click the PandaDoc link to view/edit the draft document
7. Review the pricing and ROI breakdown in the HubSpot card

### Enterprise Volumes

For deals with `monthly_order_volume >= 700,000`:
- The system will display a warning message
- No document will be created automatically
- Manual enterprise quote process should be initiated

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

### Hours Lookup

The system uses a granular lookup table with volume-based hours allocation. See [src/app/utils/roiEngine.js](src/app/utils/roiEngine.js) for the complete matrix.

## Error Handling

The solution includes comprehensive error handling:

- **Enterprise Volume Alert** - Friendly warning for volumes >= 700,000
- **Missing Deal Properties** - Graceful handling with default values
- **PandaDoc API Errors** - Detailed error messages with logging
- **Network Failures** - User-friendly error alerts

## Testing

### Test Scenarios

1. **Low Volume Deal** (< 10,000 orders/month)
   - Should return 50% discount tier
   - Basic ROI hours allocation

2. **Mid Volume Deal** (100,000 - 200,000 orders/month)
   - Should return appropriate tier
   - Moderate ROI hours

3. **High Volume Deal** (500,000 - 699,999 orders/month)
   - Should return highest tier
   - Maximum ROI hours

4. **Enterprise Volume** (>= 700,000 orders/month)
   - Should display warning
   - No document created

### Manual Testing

1. Create test deals with various `monthly_order_volume` values
2. Set `p_3pl_yearly_turnover` to test leakage calculations
3. Click "Generate ROI Proposal" and verify:
   - Correct pricing tier selected
   - Accurate ROI calculations
   - PandaDoc document created with correct tokens
   - UI displays summary correctly

## Troubleshooting

### "Failed to create PandaDoc document"

- Verify your `PANDADOC_API_KEY` secret is set correctly
- Check that the `PANDADOC_TEMPLATE_ID` exists and is accessible
- Ensure template has all required tokens configured

### "Unable to determine pricing/ROI for this volume"

- Check that `monthly_order_volume` is a valid number
- Verify the value is not negative or null

### Card not appearing on Deal records

- Verify deployment: `hs project upload`
- Check HubSpot account has UI Extensions enabled
- Ensure proper scopes in `hubspot.config.yml`

## Customization

### Modify Pricing Tiers

Edit [src/app/utils/pricingEngine.js](src/app/utils/pricingEngine.js):

```javascript
const PRICING_TIERS = [
  { volumeUpTo: 9999, originalPrice: 2000, discountedPrice: 1000, discountPercent: 50 },
  // Add/modify tiers here
];
```

### Modify ROI Calculations

Edit [src/app/utils/roiEngine.js](src/app/utils/roiEngine.js) for hours lookup.

Edit [src/app/utils/roiCalculator.js](src/app/utils/roiCalculator.js) for calculation formulas.

### Customize PandaDoc Payload

Edit the `createPandaDocDraft` function in [src/app/functions/generateROIProposal.js](src/app/functions/generateROIProposal.js).

## Support

For issues or questions:
1. Check the HubSpot developer logs: Settings → Integrations → Developer Projects
2. Review PandaDoc API logs in your PandaDoc account
3. Check browser console for UI Extension errors

## License

Proprietary - Internal Use Only
