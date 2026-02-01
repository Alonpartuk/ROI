import React, { useState, useEffect } from 'react';
import {
  Button,
  Text,
  Flex,
  LoadingSpinner,
  Alert,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Link,
  hubspot
} from '@hubspot/ui-extensions';

// Define the extension to be run within the HubSpot CRM
hubspot.extend(({ context, runServerlessFunction, actions }) => {
  const useFetchCrmObjectProperties = hubspot.useFetchCrmObjectProperties || hubspot.CRM?.useFetchCrmObjectProperties;

  return (
    <Extension
      context={context}
      runServerless={runServerlessFunction}
      sendAlert={actions.addAlert}
      useFetchCrmObjectProperties={useFetchCrmObjectProperties}
    />
  );
});

// Main Extension Component
const Extension = ({ context, runServerless, sendAlert, useFetchCrmObjectProperties }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const dealId = context.crm.objectId;

  // Fetch the doc_link_roi property (lowercase!)
  let dealProperties = {};
  try {
    if (useFetchCrmObjectProperties) {
      const fetchResult = useFetchCrmObjectProperties(['doc_link_roi']);
      dealProperties = fetchResult?.data || {};
    }
  } catch (err) {
    console.error('Error fetching CRM properties:', err);
  }

  const [presentationLink, setPresentationLink] = useState(dealProperties?.doc_link_roi || null);
  const [isPolling, setIsPolling] = useState(false);

  // Update presentationLink when dealProperties changes
  useEffect(() => {
    if (dealProperties?.doc_link_roi) {
      console.log('📋 doc_link_roi from CRM properties:', dealProperties.doc_link_roi);
      setPresentationLink(dealProperties.doc_link_roi);
    }
  }, [dealProperties]);

  // Log whenever presentationLink changes
  useEffect(() => {
    console.log('🔗 Presentation link state updated:', presentationLink);
  }, [presentationLink]);

  // Poll for presentation link after PDF generation starts
  useEffect(() => {
    let pollInterval;

    if (isPolling) {
      // Check every 3 seconds for up to 5 minutes
      let pollCount = 0;
      const maxPolls = 100; // 100 * 3 seconds = 5 minutes

      console.log('🚀 Starting polling for PDF link...');

      pollInterval = setInterval(async () => {
        pollCount++;

        console.log(`\n📡 Polling for PDF link... attempt ${pollCount}/${maxPolls}`);
        console.log(`⏰ Time elapsed: ${(pollCount * 3)} seconds`);

        // Fetch the presentation_link property via serverless function
        try {
          const checkResponse = await runServerless({
            name: 'generateROIProposal',
            parameters: { dealId, checkPresentationLink: true }
          });

          const response = checkResponse.response || checkResponse;

          console.log('📦 Polling response:', response);
          console.log('🔗 Presentation link value:', response.presentationLink);

          if (response.presentationLink) {
            console.log('✅ PDF link found:', response.presentationLink);
            clearInterval(pollInterval);

            // Update the presentation link first
            console.log('💾 Setting presentation link state...');
            setPresentationLink(response.presentationLink);

            // Show alert immediately
            console.log('🔔 Showing success alert...');
            sendAlert({
              type: 'success',
              message: 'File is ready! Click "View Generated ROI File" to open it.'
            });

            console.log('🛑 Stopping polling...');
            setIsPolling(false);
          } else {
            console.log('❌ No presentation link yet, will retry in 3 seconds...');
          }
        } catch (err) {
          console.error('❗ Error checking for PDF link:', err);
        }

        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setIsPolling(false);
          console.log('⏹️ Stopped polling - max attempts reached (5 minutes)');
          sendAlert({
            type: 'warning',
            message: 'File generation is taking longer than expected. Please use the "Check for PDF" button to manually check.'
          });
        }
      }, 3000); // Poll every 3 seconds instead of 5
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isPolling, dealId, runServerless, sendAlert]);

  const calculateROI = async () => {
    setLoading(true);
    setError(null);

    try {
      const serverlessResponse = await runServerless({
        name: 'generateROIProposal',
        parameters: { dealId }
      });

      console.log('Response from serverless:', serverlessResponse);

      // HubSpot wraps the response in a 'response' property
      const response = serverlessResponse.response || serverlessResponse;

      console.log('Unwrapped response:', response);

      if (response.success) {
        setResult(response);

        // Show warnings if there are missing fields
        if (response.warnings && response.warnings.length > 0) {
          sendAlert({
            type: 'warning',
            message: response.warnings.join('; ')
          });
        }
      } else {
        // Handle specific error types
        if (response.error === 'MISSING_DATA') {
          setError({
            type: 'warning',
            title: response.message || 'Missing Data',
            message: response.details || 'Please fill in the required fields',
            missingFields: response.missingFields
          });
        } else if (response.error === 'ENTERPRISE_VOLUME') {
          setError({
            type: 'warning',
            title: 'Manual Enterprise Quote Required',
            message: response.message,
            volume: response.volume
          });
        } else {
          setError({
            type: 'danger',
            title: response.error || 'Error',
            message: response.message || 'Failed to calculate ROI'
          });
        }
      }
    } catch (err) {
      console.error('Error calling serverless function:', err);
      setError({
        type: 'danger',
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate on mount
  useEffect(() => {
    try {
      calculateROI();
    } catch (err) {
      console.error('Error in auto-calculate:', err);
    }
  }, []);

  // Generate PDF via webhook
  const generatePDF = async () => {
    if (!result || !result.success) {
      sendAlert({
        type: 'danger',
        message: 'No ROI data available to generate PDF'
      });
      return;
    }

    setPdfLoading(true);

    try {
      const serverlessResponse = await runServerless({
        name: 'triggerPDFGeneration',
        parameters: {
          dealId: dealId,
          dealName: result.dealName || 'Unknown Deal',
          originalPrice: result.pricing.originalPrice,
          discountPrice: result.pricing.discountedPrice,
          discountPercent: result.pricing.discountPercent,
          totalMonthlyRoi: result.roi.totalMonthlyROI,
          billingHoursSaved: result.roi.billing.hours,
          billingVal: result.roi.billing.value,
          analyticsHoursSaved: result.roi.analytics.hours,
          analyticsVal: result.roi.analytics.value,
          ticketsHoursSaved: result.roi.tickets.hours,
          ticketsVal: result.roi.tickets.value,
          leakageVal: result.roi.leakage.value
        }
      });

      console.log('PDF generation response:', serverlessResponse);

      const response = serverlessResponse.response || serverlessResponse;

      if (response.success) {
        sendAlert({
          type: 'success',
          message: 'PDF generation started successfully! Please wait, we will notify you when it\'s ready.'
        });
        // Start polling for the presentation link
        setIsPolling(true);
      } else {
        sendAlert({
          type: 'danger',
          message: response.message || 'Failed to generate PDF'
        });
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      sendAlert({
        type: 'danger',
        message: 'Failed to generate PDF. Please try again.'
      });
    } finally {
      setPdfLoading(false);
    }
  };

  // Manual check for PDF link
  const checkForPDF = async () => {
    setLoading(true);
    try {
      const checkResponse = await runServerless({
        name: 'generateROIProposal',
        parameters: { dealId, checkPresentationLink: true }
      });

      const response = checkResponse.response || checkResponse;

      if (response.presentationLink) {
        setPresentationLink(response.presentationLink);
        sendAlert({
          type: 'success',
          message: 'File is ready! Click "View Generated ROI File" to open it.'
        });
        setIsPolling(false);
      } else {
        sendAlert({
          type: 'info',
          message: 'File is still being generated. Please wait a moment and try again.'
        });
      }
    } catch (err) {
      console.error('Error checking for PDF:', err);
      sendAlert({
        type: 'danger',
        message: 'Failed to check PDF status. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" gap="medium">
      {/* Header */}
      <Flex direction="row" justify="between" align="center">
        <Text format={{ fontWeight: 'bold', fontSize: 'large' }}>
          Live ROI Calculator
        </Text>
        <Button
          size="xs"
          onClick={calculateROI}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Flex>

      <Divider />

      {/* Loading State */}
      {loading && !result && (
        <Flex direction="column" align="center" gap="small">
          <LoadingSpinner />
          <Text>Calculating ROI...</Text>
        </Flex>
      )}

      {/* Error Alert */}
      {error && (
        <Flex direction="column" gap="small">
          <Alert title={error.title} variant={error.type}>
            <Text>{error.message}</Text>
          </Alert>
          {error.missingFields && error.missingFields.length > 0 && (
            <Flex direction="column" gap="xs">
              <Text format={{ fontWeight: 'bold' }}>Please fill in the following fields:</Text>
              {error.missingFields.map((field, index) => (
                <Text key={index}>• {field}</Text>
              ))}
            </Flex>
          )}
          {error.volume && (
            <Text>
              Volume: {error.volume.toLocaleString()} orders/month
            </Text>
          )}
        </Flex>
      )}

      {/* Results Display */}
      {result && result.success && (
        <Flex direction="column" gap="medium">
          {/* Missing Fields Warning */}
          {result.missingFields && result.missingFields.length > 0 && (
            <Alert title="Partial Data" variant="warning">
              <Flex direction="column" gap="xs">
                <Text>Some fields are missing. ROI calculated with available data:</Text>
                {result.missingFields.map((field, index) => (
                  <Text key={index}>• {field}</Text>
                ))}
              </Flex>
            </Alert>
          )}

          {/* Pricing Summary */}
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: 'bold' }}>Subscription Pricing</Text>
            <Table bordered>
              <TableBody>
                <TableRow>
                  <TableCell>Original Price</TableCell>
                  <TableCell>${result.pricing.originalPrice.toLocaleString()}/mo</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <Text format={{ fontWeight: 'bold' }}>Special Price</Text>
                  </TableCell>
                  <TableCell>
                    <Text format={{ fontWeight: 'bold', fontSize: 'large' }}>${result.pricing.discountedPrice.toLocaleString()}/mo</Text>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Discount</TableCell>
                  <TableCell>{result.pricing.discountPercent}% OFF</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Flex>

          <Divider />

          {/* ROI Breakdown Table */}
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: 'bold' }}>Monthly ROI Breakdown</Text>
            <Table bordered>
              <TableHead>
                <TableRow>
                  <TableHeader>Benefit</TableHeader>
                  <TableHeader>Hours Saved</TableHeader>
                  <TableHeader>Monthly Value</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Billing Automation</TableCell>
                  <TableCell>{result.roi.billing.hours}h</TableCell>
                  <TableCell>${result.roi.billing.value.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Analytics Insights</TableCell>
                  <TableCell>{result.roi.analytics.hours}h</TableCell>
                  <TableCell>${result.roi.analytics.value.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Ticket Reduction</TableCell>
                  <TableCell>{result.roi.tickets.hours}h</TableCell>
                  <TableCell>${result.roi.tickets.value.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Revenue Leakage Prevention</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>${result.roi.leakage.value.toLocaleString(undefined, {maximumFractionDigits: 0})}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Flex>

          <Divider />

          {/* Total Savings - Large Display */}
          <Flex direction="column" gap="small" align="center">
            <Text format={{ fontWeight: 'bold' }}>Total Monthly Potential Savings</Text>
            <Text format={{ fontWeight: 'bold', fontSize: 'xxlarge' }}>
              ${result.roi.totalMonthlyROI.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </Text>
            <Text>
              ROI Payback: {(result.pricing.discountedPrice / result.roi.totalMonthlyROI).toFixed(1)} months
            </Text>
          </Flex>

          <Divider />

          {/* PDF Generation Buttons */}
          <Flex direction="column" gap="small">
            {/* Generate PDF Button */}
            <Button
              onClick={generatePDF}
              disabled={pdfLoading}
              variant="primary"
            >
              {pdfLoading ? 'Generating PDF...' : '📽️ Generate ROI File'}
            </Button>

            {/* Check for PDF Button - Only shown when polling is active but no link yet */}
            {isPolling && !presentationLink && (
              <Button
                onClick={checkForPDF}
                disabled={loading}
                variant="secondary"
              >
                {loading ? 'Checking...' : '🔍 Check for PDF'}
              </Button>
            )}

            {/* View Generated File Link - Always shown if link exists */}
            {presentationLink && (
              <Link href={presentationLink} target="_blank">
                <Button variant="secondary">
                  📂 View Generated ROI File
                </Button>
              </Link>
            )}
          </Flex>
        </Flex>
      )}
    </Flex>
  );
};

export default Extension;
