// netlify/functions/update-order-status.js
// Admin dùng để chuyển trạng thái đơn thủ công (khi khách CK sai nội dung)

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwSKXfOS23CyNYjZ3P6329D91NGXuTFNxJso1PsAlCCuFcogv8zogrsXo6ia9lIHa4w/exec';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'thanhlien2024';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (token !== ADMIN_TOKEN) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { orderId, status, note } = body;
  const VALID_STATUSES = ['PENDING', 'DA_THANH_TOAN', 'HUY'];

  if (!orderId || !VALID_STATUSES.includes(status)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'orderId và status hợp lệ là bắt buộc' }),
    };
  }

  const updateData = {
    action: 'updateOrderStatus',
    orderId,
    status,
    note: note || 'Cập nhật thủ công bởi admin',
    transactionDate: new Date().toISOString(),
    manualUpdate: true,
  };

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const responseText = await res.text();
    let responseJson = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }

    if (!res.ok || (responseJson && responseJson.success === false)) {
      throw new Error(responseJson?.error || responseText || 'Apps Script update failed');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, orderId, status }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update order' }),
    };
  }
};
