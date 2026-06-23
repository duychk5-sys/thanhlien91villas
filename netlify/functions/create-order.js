// netlify/functions/create-order.js
// Tạo đơn PENDING → ghi vào Google Sheets qua Apps Script

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

// Giá cố định theo gói — khớp với B column trong sheet
const PACKAGES = {
  'Ngày cuối tuần (4.890k)': 4890000,
  'Ngày trong tuần (2.990k)': 2990000,
};

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
  const amount = PACKAGES[packageName];
  if (!amount) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Gói không hợp lệ: ' + packageName }) };
  }

  // Tạo mã đơn unique: TL + timestamp 8 số
  const orderId = 'TL' + Date.now().toString().slice(-8);
  const transferContent = orderId;

  const orderData = {
    action: 'createOrder',
    orderId,
    name,
    phone,
    email: email || '',
    packageName,
    amount,
    transferContent,
    checkinDate: checkinDate || '',
    soNguoi: soNguoi || '',
    note: note || '',
  };

  // Ghi vào Google Sheets qua Apps Script
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
  } catch (e) {
    console.error('Apps Script write error:', e.message);
    // Vẫn tiếp tục trả QR cho khách — log lỗi để debug
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
