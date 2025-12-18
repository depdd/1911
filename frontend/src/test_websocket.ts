// 简单的WebSocket测试脚本
const wsUrl = 'ws://localhost:65534';
const symbol = 'EURUSD';
const timeframe = 'M1';

// 创建WebSocket连接
console.log('创建WebSocket连接...', wsUrl);

// 使用浏览器原生WebSocket API
const ws = new WebSocket(wsUrl);

// 连接打开事件
ws.onopen = () => {
  console.log('WebSocket连接已打开');
  console.log('连接状态:', ws.readyState);
  
  // 订阅ticks频道
  const subscription = {
    type: 'subscribe',
    data: {
      channels: ['ticks'],
      symbol: symbol,
      timeframe: timeframe
    }
  };
  
  console.log('发送订阅请求:', JSON.stringify(subscription));
  
  try {
    ws.send(JSON.stringify(subscription));
    console.log('订阅请求已发送');
  } catch (error) {
    console.error('发送订阅请求失败:', error);
  }
};

// 接收消息事件
ws.onmessage = (event) => {
  console.log('收到消息:', event.data);
  
  try {
    const data = JSON.parse(event.data);
    console.log('解析后的消息:', data);
  } catch (error) {
    console.error('解析消息失败:', error);
  }
};

// 错误事件
ws.onerror = (error) => {
  console.error('WebSocket错误:', error);
  console.error('错误类型:', error.type);
  console.error('错误目标:', error.target);
};

// 连接关闭事件
ws.onclose = (event) => {
  console.log('WebSocket连接已关闭');
  console.log('关闭代码:', event.code);
  console.log('关闭原因:', event.reason);
  console.log('是否正常关闭:', event.wasClean);
};

// 5秒后关闭连接
setTimeout(() => {
  console.log('手动关闭WebSocket连接');
  ws.close();
}, 5000);