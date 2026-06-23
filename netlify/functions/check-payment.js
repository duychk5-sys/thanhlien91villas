// netlify/functions/check-payment.js
// Frontend polling mỗi 5s — kiểm tra cột I (Trạng thái) theo mã đơn

const SHEET_CSV_URL = process.env.SHEET_ORDERS_CSV_URL;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const { order_id } = event.queryStringParameters || {};
  if (!order_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing order_id' }) };
  }

  try {
    const res = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
    const text = await res.text();
    const status = findStatus(text, order_id);
    return { statusCode: 200, headers, body: JSON.stringify({ status: status || 'PENDING', orderId: order_id }) };
  } catch (e) {
    // Trả PENDING để frontend tiếp tục poll
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'PENDING' }) };
  }
};

function findStatus(text, orderId) {
  const lines = text.trim().split('\n');
  // Data từ hàng index 2 (hàng 3 trong sheet)
  // Cột H (index 7) = Mã đơn, Cột I (index 8) = Trạng thái
  for (let i = 2; i < lines.length; i++) {
    const cols = splitCSV(lines[i]);
    if (String(cols[7] || '').toUpperCase() === String(orderId).toUpperCase()) {
      return cols[8] || 'PENDING';
    }
  }
  return null;
}

function splitCSV(line) {
  const result = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}
