// netlify/functions/get-orders.js
// Admin lấy danh sách đơn — đọc CSV từ Google Sheets
// Header ở hàng 2, data từ hàng 3
// Cột: A=Thời gian B=Gói C=Tên D=SĐT E=Checkin F=SốNgười G=GhiChú H=MãĐơn I=TrạngThái J=NộiDungCK

const SHEET_CSV_URL = process.env.SHEET_ORDERS_CSV_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'thanhlien2024';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const token = (event.headers['authorization'] || '').replace('Bearer ', '');
  if (token !== ADMIN_TOKEN) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const res = await fetch(SHEET_CSV_URL + '&t=' + Date.now());
    const text = await res.text();
    const orders = parseCSV(text);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, orders }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch orders: ' + e.message }) };
  }
};

function parseCSV(text) {
  const lines = text.trim().split('\n');
  // Hàng 0 = hàng 1 sheet (trống/merge)
  // Hàng 1 = hàng 2 sheet (header)
  // Hàng 2+ = data thực tế
  const orders = [];
  for (let i = 2; i < lines.length; i++) {
    const c = splitCSV(lines[i]);
    if (!c[0] && !c[2]) continue; // bỏ hàng trống

    orders.push({
      thoiGian:     c[0] || '',
      packageName:  c[1] || '',
      name:         c[2] || '',
      phone:        c[3] || '',
      checkinDate:  c[4] || '',
      soNguoi:      c[5] || '',
      note:         c[6] || '',
      orderId:      c[7] || '',   // H
      status:       c[8] || '',   // I
      transferContent: c[9] || '', // J
    });
  }
  return orders.reverse(); // mới nhất lên đầu
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
