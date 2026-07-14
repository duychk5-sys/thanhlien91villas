// netlify/functions/create-order.js
// Tạo đơn PENDING → ghi vào Google Sheets qua Apps Script

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwSKXfOS23CyNYjZ3P6329D91NGXuTFNxJso1PsAlCCuFcogv8zogrsXo6ia9lIHa4w/exec';

// Giá cố định theo gói — khớp với B column trong sheet
const PACKAGES = {
  'Ngày cuối tuần': 4890000,
  'Ngày trong tuần': 2990000,
  'Gói đặc biệt': 6500000,
};

function normalizePackageName(value) {
  return String(value || '').trim().toLowerCase();
}

function getPackageInfo(packageName) {
  const canonical = Object.keys(PACKAGES).find((key) => normalizePackageName(key) === normalizePackageName(packageName));
  if (!canonical) return null;
  return { packageName: canonical, amount: PACKAGES[canonical] };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { name, phone, email, packageName, checkinDate, soNguoi, note } = body;

  // Validate bắt buộc
  if (!name || !phone || !packageName) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Thiếu thông tin bắt buộc: tên, SĐT, gói' }) };
  }

  // Server-side validate số tiền theo gói — client KHÔNG được tự gửi amount
  const packageInfo = getPackageInfo(packageName);
  if (!packageInfo) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Gói không hợp lệ: ' + packageName }) };
  }

  const amount = packageInfo.amount;
  const canonicalPackageName = packageInfo.packageName;

  // Tạo mã đơn unique: TL + timestamp 8 số
  const orderId = 'TL' + Date.now().toString().slice(-8);
  const transferContent = orderId;

  const orderData = {
    action: 'createOrder',
    orderId,
    name,
    phone,
    email: email || '',
    packageName: canonicalPackageName,
    amount,
    transferContent,
    checkinDate: checkinDate || '',
    soNguoi: soNguoi || '',
    note: note || '',
  };

  // Ghi vào Google Sheets qua Apps Script
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    const responseText = await response.text();
    let responseJson = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }

    if (!response.ok || (responseJson && responseJson.success === false)) {
      throw new Error(responseJson?.error || responseText || 'Apps Script write failed');
    }
  } catch (e) {
    console.error('Apps Script write error:', e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Không thể tạo đơn hàng. Vui lòng thử lại sau.' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      orderId,
      transferContent,
      amount,
      bankAccount: process.env.BANK_ACCOUNT || '',
      bankName: process.env.BANK_NAME || 'TPBank',
      accountName: process.env.ACCOUNT_NAME || '',
    }),
  };
};
