// BACKUP of original card
import React, { useState } from 'react';
import {
  Button,
  Text,
  Flex,
  LoadingSpinner,
  Alert,
  Link,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  hubspot
} from '@hubspot/ui-extensions';

// Define the extension to be run within the HubSpot CRM
hubspot.extend(({ context, runServerlessFunction, actions }) => (
  <Extension
    context={context}
    runServerless={runServerlessFunction}
    sendAlert={actions.addAlert}
  />
));

// Main Extension Component
const Extension = ({ context, runServerless, sendAlert }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const dealId = context.crm.objectId;

  const handleGenerateProposal = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await runServerless({
        name: 'generateROIProposal',
        parameters: { dealId }
      });

      if (response.success) {
        setResult(response);
        sendAlert({
          type: 'success',
          message: 'ROI Proposal generated successfully!'
        });
      } else {
        // Handle specific error types
        if (response.error === 'ENTERPRISE_VOLUME') {
          setError({
            type: 'warning',
            title: 'Manual Enterprise Quote Required',
            message: response.message,
            volume: response.volume
          });
        } else {
          setError({
            type: 'danger',
            title: 'Error',
            message: response.message || 'Failed to generate proposal'
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

  return (
    <Flex direction="column" gap="medium">
      {/* Header */}
      <Text format={{ fontWeight: 'bold' }}>
        ROI Proposal Generator
      </Text>
      <Text>
        Generate an automated ROI proposal with pricing as a HubSpot Quote
      </Text>

      <Divider />

      {/* Generate Button */}
      <Button
        type="submit"
        onClick={handleGenerateProposal}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate ROI Quote'}
      </Button>

      {/* Loading State */}
      {loading && (
        <Flex direction="column" align="center" gap="small">
          <LoadingSpinner />
          <Text>Creating quote with calculated ROI...</Text>
        </Flex>
      )}

      {/* Error Alert */}
      {error && (
        <Alert title={error.title} variant={error.type}>
          {error.message}
          {error.volume && (
            <Text>
              <br />
              Volume: {error.volume.toLocaleString()} orders/month
            </Text>
          )}
        </Alert>
      )}

      {/* Success Result */}
      {result && result.success && (
        <Flex direction="column" gap="medium">
          <Alert title="Quote Created!" variant="success">
            Your ROI proposal quote has been created successfully
          </Alert>

          {/* Quote Link */}
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: 'bold' }}>HubSpot Quote:</Text>
            <Link href={result.quoteUrl} target="_blank">
              Open Quote →
            </Link>
          </Flex>

          <Divider />

          {/* Pricing Summary */}
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: 'bold' }}>Pricing Summary</Text>
            <Table bordered>
              <TableBody>
                <TableRow>
                  <TableCell>Original Price</TableCell>
                  <TableCell>${result.pricing.originalPrice.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Discounted Price</TableCell>
                  <TableCell>${result.pricing.discountedPrice.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Discount</TableCell>
                  <TableCell>{result.pricing.discountPercent}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Flex>

          {/* ROI Breakdown */}
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: 'bold' }}>ROI Breakdown (Monthly)</Text>
            <Table bordered>
              <TableHead>
                <TableRow>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Hours</TableHeader>
                  <TableHeader>Value</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Billing</TableCell>
                  <TableCell>{result.roi.billing.hours}h</TableCell>
                  <TableCell>${result.roi.billing.value.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Analytics</TableCell>
                  <TableCell>{result.roi.analytics.hours}h</TableCell>
                  <TableCell>${result.roi.analytics.value.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Tickets</TableCell>
                  <TableCell>{result.roi.tickets.hours}h</TableCell>
                  <TableCell>${result.roi.tickets.value.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Leakage Prevention</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>${result.roi.leakage.value.toLocaleString(undefined, {maximumFractionDigits: 2})}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell format={{ fontWeight: 'bold' }}>Total Monthly ROI</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell format={{ fontWeight: 'bold' }}>
                    ${result.roi.totalMonthlyROI.toLocaleString(undefined, {maximumFractionDigits: 2})}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
};
