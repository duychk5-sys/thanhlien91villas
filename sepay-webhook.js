// netlify/functions/sepay-webhook.js
// Sepay gọi endpoint này khi có giao dịch khớp
// Docs: https://sepay.vn/tai-lieu-api.html

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwSKXfOS23CyNYjZ3P6329D91NGXuTFNxJso1PsAlCCuFcogv8zogrsXo6ia9lIHa4w/exec';
const SEPAY_SECRET = process.env.SEPAY_SECRET || ''; // optional: dùng để verify webhook

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Invalid JSON' }) };
  }

  const transferAmount = payload.transferAmount || payload.transfer_amount || payload.amount || '';
  const transferContent = payload.transferContent || payload.transfer_content || payload.content || '';
  const referenceCode = payload.referenceCode || payload.reference_code || '';
  const transactionDate = payload.transactionDate || payload.transaction_date || new Date().toISOString();

  if (!transferContent || !transferAmount) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, message: 'Missing required fields' }),
    };
  }

  const orderIdMatch = String(transferContent).match(/TL\d{8}/i);
  if (!orderIdMatch) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, message: 'Order ID not found in transfer content' }),
    };
  }

  const orderId = orderIdMatch[0].toUpperCase();
  const updateData = {
    action: 'updateOrderStatus',
    orderId,
    status: 'DA_THANH_TOAN',
    paidAmount: transferAmount,
    referenceCode: referenceCode || '',
    transactionDate,
    transferContent,
  };

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const responseText = await response.text();
    let responseJson = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }

    if (!response.ok || (responseJson && responseJson.success === false)) {
      throw new Error(responseJson?.error || responseText || 'Apps Script update failed');
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Failed to update order', error: e.message }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true }),
  };
};
