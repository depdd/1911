// 模拟WebSocket服务发送带有各种time类型的kline_data消息
const WebSocket = require('ws');

// 创建一个测试WebSocket客户端
const ws = new WebSocket('ws://localhost:65534');

ws.on('open', function open() {
  console.log('WebSocket连接已建立');
  
  // 发送不同类型time字段的kline_data消息
  const testMessages = [
    // 数字时间戳
    {
      type: 'kline_data',
      payload: {
        symbol: 'BTCUSDT',
        time: 1766053312,
        open: 50000,
        high: 51000,
        low: 49000,
        close: 50500,
        volume: 100
      }
    },
    // 普通对象（模拟之前的错误情况）
    {
      type: 'kline_data',
      payload: {
        symbol: 'BTCUSDT',
        time: { year: 2024, month: 7, day: 18 },
        open: 50500,
        high: 51500,
        low: 49500,
        close: 51000,
        volume: 200
      }
    },
    // 空对象（模拟之前的错误情况）
    {
      type: 'kline_data',
      payload: {
        symbol: 'BTCUSDT',
        time: {},
        open: 51000,
        high: 52000,
        low: 50000,
        close: 51500,
        volume: 150
      }
    }
  ];
  
  // 发送测试消息
  testMessages.forEach((msg, index) => {
    setTimeout(() => {
      console.log(`\n发送测试消息 ${index + 1}:`, {
        type: msg.type,
        time: msg.payload.time,
        timeType: typeof msg.payload.time
      });
      ws.send(JSON.stringify(msg));
    }, index * 1000);
  });
  
  // 5秒后关闭连接
  setTimeout(() => {
    console.log('\n关闭WebSocket连接');
    ws.close();
  }, 5000);
});

ws.on('message', function message(data) {
  console.log('收到消息:', JSON.parse(data));
});

ws.on('error', function error(err) {
  console.error('WebSocket错误:', err);
});

ws.on('close', function close() {
  console.log('WebSocket连接已关闭');
});