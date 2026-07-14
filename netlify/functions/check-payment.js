// netlify/functions/check-payment.js
// Poll Sepay transactions and auto-update order status via Apps Script

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';

exports.handler = async (event) => {
  const { order_id, amount } = event.queryStringParameters || {};

  const res = await fetch(
    `https://my.sepay.vn/userapi/transactions/list?account_number=92356181981&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.SEPAY_API_KEY}`
      }
    }
  );

  const data = await res.json();

  if (data && data.transactions) {
    for (const tx of data.transactions) {
      if (
        Number(tx.amount_in) >= parseInt(amount) &&
        tx.transaction_content && tx.transaction_content.toUpperCase().includes((order_id||'').toUpperCase())
      ) {
        // Auto-update order status in Google Sheets if APPS_SCRIPT_URL configured
        if (APPS_SCRIPT_URL) {
          try {
            const updateData = {
              action: 'updateOrderStatus',
              orderId: order_id,
              status: 'DA_THANH_TOAN',
              note: 'Tự động xác nhận qua Sepay',
              transactionDate: new Date().toISOString(),
              manualUpdate: false,
            };

            // Fire-and-forget update (await to ensure success if desired)
            await fetch(APPS_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData),
            });
          } catch (e) {
            console.error('Auto-update order status failed:', e.message || e);
          }
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ status: 'paid' })
        };
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'pending' })
  };
};