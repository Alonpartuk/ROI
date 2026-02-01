/**
 * HubSpot Serverless Function: Trigger PDF Generation
 * 
 * Sends ROI data to Make.com webhook for PDF generation
 */

exports.main = async (context = {}) => {
  const {
    dealId,
    dealName,
    originalPrice,
    discountPrice,
    discountPercent,
    totalMonthlyRoi,
    billingHoursSaved,
    billingVal,
    analyticsHoursSaved,
    analyticsVal,
    ticketsHoursSaved,
    ticketsVal,
    leakageVal
  } = context.parameters;

  try {
    // Make.com webhook URL for PDF generation
    const webhookUrl = 'https://hook.eu2.make.com/jhtpqrt27v2v44gcfr48p6zmrjwlfseo';

    console.log('Received parameters:', {
      dealId,
      dealName,
      originalPrice,
      discountPrice,
      discountPercent,
      totalMonthlyRoi
    });

    const payload = {
      deal_id: dealId,
      deal_name: dealName,
      original_price: originalPrice,
      discount_price: discountPrice,
      discount_percent: discountPercent,
      total_monthly_roi: totalMonthlyRoi,
      billing_hours_saved: billingHoursSaved,
      billing_val: billingVal,
      analytics_hours_saved: analyticsHoursSaved,
      analytics_val: analyticsVal,
      tickets_hours_saved: ticketsHoursSaved,
      tickets_val: ticketsVal,
      leakage_val: leakageVal
    };

    console.log('Sending request to webhook:', webhookUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log('Webhook response status:', response.status);

    if (response.ok) {
      return {
        success: true,
        message: 'PDF generation triggered successfully'
      };
    } else {
      const errorText = await response.text();
      console.error('Webhook error response:', errorText);
      return {
        success: false,
        error: 'WEBHOOK_ERROR',
        message: `Webhook returned status ${response.status}: ${errorText}`
      };
    }
  } catch (error) {
    console.error('Error triggering PDF generation:', error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message || 'Failed to trigger PDF generation'
    };
  }
};
