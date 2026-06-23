// netlify/functions/sepay-webhook.js
// Sepay gọi endpoint này khi có giao dịch khớp
// Docs: https://sepay.vn/tai-lieu-api.html

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
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
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Invalid JSON' }) };
  }

  console.log('Sepay webhook received:', JSON.stringify(payload));

  // Sepay gửi các field: transferAmount, transferContent, referenceCode, accountNumber, etc.
  const {
    transferAmount,
    transferContent,
    referenceCode,
    accountNumber,
    transactionDate,
  } = payload;

  if (!transferContent || !transferAmount) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, message: 'Missing required fields' }),
    };
  }

  // Tìm orderId trong nội dung chuyển khoản
  // Nội dung CK thường chứa mã đơn, ví dụ: "TL12345678" hoặc "DH TL12345678 ..."
  const orderIdMatch = transferContent.match(/TL\d{8}/i);
  if (!orderIdMatch) {
    console.log('No order ID found in transfer content:', transferContent);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, message: 'Order ID not found in transfer content' }),
    };
  }

  const orderId = orderIdMatch[0].toUpperCase();

  // Cập nhật trạng thái đơn hàng trong Google Sheets
  const updateData = {
    action: 'updateOrderStatus',
    orderId,
    status: 'DA_THANH_TOAN',
    paidAmount: transferAmount,
    referenceCode: referenceCode || '',
    transactionDate: transactionDate || new Date().toISOString(),
    transferContent,
  };

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    console.log('Updated order status:', orderId);
  } catch (e) {
    console.error('Failed to update Google Sheets:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Failed to update order' }),
    };
  }

  // Sepay yêu cầu trả về { success: true } để xác nhận đã nhận webhook
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true }),
  };
};
