# Deployment Guide

## Quick Start Deployment

Follow these steps to deploy the HubSpot-to-PandaDoc ROI Engine.

## Prerequisites Checklist

- [ ] HubSpot Sales Hub Enterprise account
- [ ] HubSpot developer account with project creation permissions
- [ ] PandaDoc account with API access
- [ ] PandaDoc API key
- [ ] PandaDoc template created with required tokens
- [ ] Node.js 18+ installed
- [ ] Deal properties created in HubSpot:
  - `monthly_order_volume` (Number field)
  - `p_3pl_yearly_turnover` (Number field)

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

### 4. Configure HubSpot Secrets

#### Add PandaDoc API Key

```bash
hs secrets add PANDADOC_API_KEY
```

When prompted, paste your PandaDoc API key (found in PandaDoc → Settings → API).

#### Add PandaDoc Template ID

```bash
hs secrets add PANDADOC_TEMPLATE_ID
```

When prompted, paste your template UUID (found in the template URL or via API).

### 5. Verify hubspot.config.yml

Ensure your `hubspot.config.yml` is correctly configured:

```yaml
name: roi-proposal-generator
version: 1.0.0

extensions:
  - type: crm-card
    file: ./src/app/extensions/ROIProposalCard.jsx
    scopes:
      - crm.objects.deals.read
      - crm.objects.deals.write

functions:
  - file: ./src/app/functions/generateROIProposal.js
    secrets:
      - PANDADOC_API_KEY
    scopes:
      - crm.objects.deals.read
```

### 6. Deploy to HubSpot

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

### 7. Verify Deployment

#### Check HubSpot Developer Projects

1. Log into HubSpot
2. Go to Settings → Integrations → Developer Projects
3. Find "roi-proposal-generator"
4. Verify status is "Active"

#### Check Extension on Deal Record

1. Navigate to any Deal record
2. Look for "ROI Proposal Generator" card in right sidebar
3. If not visible, refresh the page

### 8. Create Test Deal

1. Create a new Deal in HubSpot
2. Set properties:
   - `monthly_order_volume`: 50000
   - `p_3pl_yearly_turnover`: 1000000
3. Click "Generate ROI Proposal"
4. Verify successful document creation

## Post-Deployment Configuration

### Configure PandaDoc Template

Your template must include these tokens:

**Pricing Section:**
```
Original Price: ${{Original_Price}}
Discounted Price: ${{Discount_Price}}
Discount: {{Discount_Percent}}%
```

**ROI Section:**
```
Billing: {{ROI_Billing_Hours}} hours = ${{ROI_Billing_Value}}
Analytics: {{ROI_Analytics_Hours}} hours = ${{ROI_Analytics_Value}}
Tickets: {{ROI_Tickets_Hours}} hours = ${{ROI_Tickets_Value}}
Leakage Prevention: ${{ROI_Leakage_Value}}
Total Monthly ROI: ${{Total_Monthly_ROI}}
```

### Update Contact Properties (Optional)

If you want to populate recipient information automatically, ensure your Deal associations include:
- `contact_email`
- `contact_firstname`
- `contact_lastname`

## Troubleshooting Deployment Issues

### Error: "Project upload failed"

**Solution:**
1. Verify authentication: `hs auth`
2. Check account permissions
3. Ensure valid `hubspot.config.yml`

### Error: "Secret not found"

**Solution:**
```bash
hs secrets list  # Verify secrets exist
hs secrets add PANDADOC_API_KEY  # Re-add if missing
```

### Extension Not Appearing

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear HubSpot cache
3. Verify extension scopes in config
4. Check developer console for errors

### PandaDoc API Errors

**Solution:**
1. Verify API key is valid
2. Check template ID is correct
3. Ensure template is published
4. Review PandaDoc API logs

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

## Rollback Procedure

If deployment causes issues:

```bash
# Revert to previous version
git checkout <previous-commit>
hs project upload
```

## Monitoring & Logs

### View Function Logs

1. HubSpot → Settings → Integrations → Developer Projects
2. Select "roi-proposal-generator"
3. Click "Logs" tab
4. Filter by function: `generateROIProposal`

### Monitor Usage

Track:
- Number of proposals generated
- Error rates
- Average execution time
- Enterprise volume alerts

## Security Best Practices

1. **Never commit secrets to Git**
   - Use `.gitignore` for `.env` files
   - Always use HubSpot Secrets manager

2. **Rotate API Keys Regularly**
   ```bash
   hs secrets update PANDADOC_API_KEY
   ```

3. **Limit API Key Permissions**
   - PandaDoc API key should only have document creation permissions
   - Review permissions quarterly

4. **Monitor API Usage**
   - Set up PandaDoc API usage alerts
   - Track monthly API call volume

## Production Checklist

Before going live:

- [ ] All secrets configured correctly
- [ ] PandaDoc template tested with all tokens
- [ ] Test deals created with various volume ranges
- [ ] Enterprise volume warning tested (>= 700,000)
- [ ] Error handling verified
- [ ] Sales team trained on usage
- [ ] Documentation distributed
- [ ] Monitoring set up
- [ ] Rollback plan documented

## Support Contacts

- **HubSpot Support**: developers@hubspot.com
- **PandaDoc Support**: support@pandadoc.com
- **Internal IT**: [Your IT contact]

## Next Steps

After successful deployment:

1. Train sales team on the tool
2. Create video walkthrough
3. Set up usage analytics
4. Gather feedback for improvements
5. Plan for feature enhancements
