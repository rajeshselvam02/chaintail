import WebSocket from 'ws';

const ws = new WebSocket('wss://mempool.space/api/v1/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({ action: 'init' }));
  ws.send(JSON.stringify({ action: 'want', data: ['blocks', 'mempool-blocks', 'stats'] }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.transactions && msg.transactions.length > 0) {
    console.log(`\n✅ transactions array found! Count: ${msg.transactions.length}`);
    console.log('Sample tx keys:', Object.keys(msg.transactions[0]));
    console.log('Sample tx:', JSON.stringify(msg.transactions[0], null, 2));
    ws.close();
  }
});
