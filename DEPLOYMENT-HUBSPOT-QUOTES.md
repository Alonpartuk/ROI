# Deployment Guide - HubSpot Quotes Version

## 🚀 Quick Deployment (No External APIs Required!)

This version uses HubSpot's **native Quote system** - completely FREE with no external dependencies.

## Prerequisites Checklist

- [ ] HubSpot Sales Hub Enterprise account
- [ ] HubSpot developer account with project creation permissions
- [ ] Node.js 18+ installed
- [ ] Deal properties created in HubSpot:
  - `monthly_order_volume` (Number field)
  - `p_3pl_yearly_turnover` (Number field)

**NO PandaDoc account needed! NO API keys needed!**

## Step-by-Step Deployment

### 1. Install HubSpot CLI

```bash
npm install -g @hubspot/cli
```

Verify installation:
```bash
hs --version
```

### 2. Authenticate HubSpot CLI

```bash
hs auth
```

Follow the prompts:
1. Select your HubSpot account
2. Authenticate via browser
3. Confirm successful authentication

### 3. Install Project Dependencies

```bash
cd c:\Users\AlonPartuk\ROI
npm install
```

### 4. Deploy to HubSpot

That's it! No secrets to configure, just deploy:

```bash
hs project upload
```

Expected output:
```
✓ Uploading project files...
✓ Building project...
✓ Deploying functions...
✓ Deploying extensions...
✓ Project deployed successfully!
```

### 5. Verify Deployment

#### Check HubSpot Developer Projects

1. Log into HubSpot
2. Go to Settings → Integrations → Developer Projects
3. Find "roi-proposal-generator"
4. Verify status is "Active"

#### Check Extension on Deal Record

1. Navigate to any Deal record
2. Look for "ROI Proposal Generator" card in right sidebar
3. If not visible, refresh the page

### 6. Create Test Deal

1. Create a new Deal in HubSpot
2. Set properties:
   - `monthly_order_volume`: 50000
   - `p_3pl_yearly_turnover`: 1000000
3. Click "Generate ROI Quote"
4. Verify successful quote creation
5. Click the quote link to view

## What Happens on First Run

The serverless function will **automatically**:

1. Create 5 products in your HubSpot Products library:
   - Subscription Service (SKU: SUBSCRIPTION)
   - ROI: Billing Automation (SKU: ROI_BILLING)
   - ROI: Analytics Savings (SKU: ROI_ANALYTICS)
   - ROI: Ticket Reduction (SKU: ROI_TICKETS)
   - ROI: Leakage Prevention (SKU: ROI_LEAKAGE)

2. These products are reused for all future quotes

## Customize Quote Appearance (Optional)

### Create a Branded Quote Template

1. Go to HubSpot → Sales → Quotes
2. Click "Templates" → "Create Template"
3. Customize:
   - Add your company logo
   - Set brand colors
   - Add company information
   - Customize header/footer
4. Set as "Default Template"

All generated quotes will use your branded template automatically!

### Add E-Signature

HubSpot Quotes have built-in e-signature:

1. Go to Quote settings
2. Enable "Require signature"
3. Configure signature fields
4. Done! Quotes will require recipient signature

## Testing the Solution

### Test Case 1: Low Volume Deal

```
monthly_order_volume: 5000
p_3pl_yearly_turnover: 500000

Expected Results:
✓ Pricing: $2,000 → $1,000 (50% discount)
✓ Quote created with line items
✓ ROI breakdown shows 10h billing, 35h analytics, 3.5h tickets
```

### Test Case 2: Mid Volume Deal

```
monthly_order_volume: 100000
p_3pl_yearly_turnover: 2000000

Expected Results:
✓ Pricing: $4,500 → $3,000 (33% discount)
✓ Quote created with line items
✓ ROI breakdown shows higher hours allocation
```

### Test Case 3: Enterprise Volume

```
monthly_order_volume: 750000
p_3pl_yearly_turnover: 10000000

Expected Results:
✓ Warning message displayed
✓ No quote created
✓ Message: "Manual enterprise quote required"
```

## Troubleshooting

### Error: "Unable to create quote"

**Possible Causes:**
- Sales Hub Enterprise not enabled
- Quotes feature not available
- Permission issues

**Solution:**
1. Verify Sales Hub Enterprise subscription
2. Go to Settings → Objects → Quotes
3. Ensure Quotes are enabled
4. Check user permissions

### Products Not Creating

**Solution:**
1. Check Products permissions in scopes
2. Verify `hubspot.config.yml` has:
   - `crm.objects.products.read`
   - `crm.objects.products.write`
3. Redeploy: `hs project upload`

### Quote Not Linking to Deal

**Solution:**
1. Verify association permissions
2. Check Deal ID is valid
3. Review function logs in HubSpot

### Extension Not Appearing

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear HubSpot cache
3. Verify extension scopes in config
4. Check developer console for errors

## Monitoring & Logs

### View Function Logs

1. HubSpot → Settings → Integrations → Developer Projects
2. Select "roi-proposal-generator"
3. Click "Logs" tab
4. Filter by function: `generateROIProposal`

### Common Log Messages

```
✓ "Created quote [ID] for deal [ID]"
✓ "Found existing product [SKU]"
✓ "Created new product [SKU]"
⚠ "Enterprise volume detected: [volume]"
❌ "Error creating quote: [error]"
```

## Updating the Application

### Make Code Changes

1. Edit files in `src/` directory
2. Test changes locally if possible

### Redeploy

```bash
hs project upload
```

### Verify Changes

1. Hard refresh HubSpot Deal page
2. Test the updated functionality
3. Check developer console for errors

## Cost Analysis

| Item | Cost |
|------|------|
| HubSpot Serverless Functions | FREE (included) |
| HubSpot UI Extensions | FREE (included) |
| HubSpot Quotes | FREE (included) |
| HubSpot E-Signature | FREE (included) |
| External APIs | $0 (none used) |
| **TOTAL MONTHLY COST** | **$0** |

Compare to PandaDoc API: ~$49-199/month + API usage fees

## Production Checklist

Before going live:

- [ ] All deal properties configured
- [ ] Test deals created with various volume ranges
- [ ] Enterprise volume warning tested (>= 700,000)
- [ ] Error handling verified
- [ ] Quote template customized with branding
- [ ] Sales team trained on usage
- [ ] Documentation distributed
- [ ] Monitoring set up
- [ ] Products visible in HubSpot Products library

## Next Steps After Deployment

1. **Train Sales Team**
   - Show where to find the extension
   - Demo quote generation
   - Explain how to send quotes to customers

2. **Set Up Workflows** (Optional)
   - Auto-notify sales when quote is viewed
   - Auto-create tasks for follow-up
   - Trigger emails when quote is signed

3. **Track Success**
   - Monitor quote acceptance rates
   - Track time saved vs manual quotes
   - Gather sales team feedback

4. **Customize Further**
   - Add more ROI line items if needed
   - Adjust pricing tiers based on data
   - Enhance quote template design

## Support

For issues:
- HubSpot Developer Docs: https://developers.hubspot.com/
- HubSpot Support: https://help.hubspot.com/
- Internal IT: [Your contact]

## Migration from PandaDoc Version

If you were using the PandaDoc version:

1. **No data loss** - Old PandaDoc documents remain accessible
2. **New quotes** will be HubSpot Quotes going forward
3. **No secrets to remove** - PandaDoc API key can remain but won't be used
4. **Products auto-create** - First run creates needed products
5. **Same UI** - Extension looks nearly identical to users

To switch:
```bash
hs project upload  # Deploys new version
```

Done! The new version automatically replaces the old one.
