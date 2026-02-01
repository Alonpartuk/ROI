# Troubleshooting: Card Not Visible

## ✅ CLI Verification Complete

The HubSpot CLI confirms:
- **Project:** roi-proposal-generator
- **Build:** #7 (SUCCESS, DEPLOYED)
- **Card:** ROI Proposal Generator
- **Location:** crm.record.sidebar
- **Object Type:** deals

## Most Common Issues & Solutions

### Issue 1: Browser Cache
**Solution:** Hard refresh your browser
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Issue 2: Card Not Enabled
**Steps:**
1. Go to any Deal record
2. Look at the RIGHT SIDEBAR
3. Click the **three dots (...)** at the top of the sidebar
4. Click **"Manage cards"**
5. Find "ROI Proposal Generator" and toggle it **ON**
6. Click **"Save"**

### Issue 3: Not on a Deal Record
**Check:**
- URL should contain `/deal/` or `/object/0-3/`
- You must be on a DEAL record (not Contact, Company, Ticket, etc.)
- Open: https://app.hubspot.com/contacts/26004468/objects/0-3/views/all/list

### Issue 4: Private App Not Installed
**Steps:**
1. Go to: https://app.hubspot.com/developer-projects/26004468/project/roi-proposal-generator
2. Check if there's an "Install" button
3. If yes, click it to install the private app
4. If already installed, try clicking "Reinstall"

### Issue 5: Card Permissions
**Check:**
1. Settings → Integrations → Private Apps
2. Find "roi-proposal-generator"
3. Make sure it's **Active**
4. Verify scopes are correct

## Debug in Browser Console

Open a Deal record and run this in the browser console (F12):

```javascript
// Check if extension is loaded
console.log('Checking for HubSpot extensions...');

// Look for extension errors
window.addEventListener('error', (e) => {
  console.error('Extension error:', e);
});

// Check React dev tools
console.log('React version:', window.React?.version);
```

## Manual Verification Steps

### Step 1: Open Developer Projects
1. Go to: https://app.hubspot.com/developer-projects/26004468/project/roi-proposal-generator
2. Verify:
   - Status: **Deployed**
   - Build: **#7**
   - Components: Should show "ROI Proposal Generator (card)"

### Step 2: Check Components Tab
1. In the project page, click **"Components"** tab
2. You should see:
   - ✅ ROI Proposal Generator (Extension)
   - ✅ generateROIProposal (Function)

### Step 3: Create New Test Deal
Sometimes cards only appear on newly created deals:

1. Go to: https://app.hubspot.com/contacts/26004468/deals
2. Click **"Create deal"**
3. Fill in:
   - Deal name: "Test ROI - Delete Me"
   - Any pipeline/stage
4. Click **"Create"**
5. **Look at the right sidebar** - scroll down if needed

### Step 4: Check Deal Settings
1. Settings → Objects → Deals → Customize record sidebar
2. Or: https://app.hubspot.com/contacts/26004468/objects/0-3/settings
3. Look for "ROI Proposal Generator" in the cards list
4. Make sure it's **visible** and **enabled**

## Check Extension Console Logs

If you have access to the project logs:

```bash
# In terminal
cd c:\Users\AlonPartuk\ROI
hs project logs --follow
```

Then open a Deal record and look for any errors.

## Alternative: Use Different Location

If sidebar doesn't work, try a different location:

### Option 1: Change to Tab Location
Edit: `src/app/extensions/ROIProposalCard.json`
```json
"location": "crm.record.tab"
```

### Option 2: Change to Preview Panel
```json
"location": "crm.preview"
```

Then redeploy:
```bash
hs project upload
```

## Still Not Working?

### Check Browser Developer Tools
1. Open a Deal record
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for any red errors mentioning:
   - "ROI"
   - "extension"
   - "React"
   - "HubSpot"

### Screenshot What You See
Take a screenshot of:
1. The Deal record page (full page)
2. The browser console (F12 → Console tab)
3. The HubSpot project page showing build #7

## Quick Test Commands

Run these to verify deployment:

```bash
# List projects
hs project list

# List builds
hs project list-builds --limit 1

# Open project in browser
hs project open
```

## Expected Result

You should see a card in the right sidebar that looks like:

```
┌─────────────────────────────────┐
│ ROI Proposal Generator          │
├─────────────────────────────────┤
│ Generate an automated ROI       │
│ proposal with pricing as a      │
│ HubSpot Quote                   │
│                                 │
│ [Generate ROI Quote]            │
└─────────────────────────────────┘
```

## Contact Info

If still not working after trying all above:
- Project URL: https://app.hubspot.com/developer-projects/26004468/project/roi-proposal-generator
- Build: #7 (deployed)
- Location: Right sidebar on Deal records
