exports.handler = async (event) => {
  const { order_id, amount } = event.queryStringParameters;

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
        tx.transaction_content && tx.transaction_content.toUpperCase().includes(order_id.toUpperCase())
      ) {
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