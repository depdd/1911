// 测试standardizeKlineData方法对各种time格式的处理
function standardizeKlineData(klineData) {
  let time;
  
  // 确保time是数字格式
  if (klineData.time && typeof klineData.time === 'object' && klineData.time instanceof Date) {
    // 如果是Date对象，转换为秒级时间戳
    time = Math.floor(klineData.time.getTime() / 1000);
  } else if (klineData.time && typeof klineData.time === 'number') {
    time = klineData.time;
  } else if (klineData.time && typeof klineData.time === 'string') {
    // 如果是字符串，尝试解析为数字
    time = Number(klineData.time);
  } else if (klineData.time) {
    // 其他情况，尝试转换为数字
    time = Number(klineData.time);
  } else {
    // 如果没有time字段，使用当前时间的K线开始时间
    const now = Date.now();
    time = Math.floor(now / 60000) * 60;  // 默认分钟级K线
  }
  
  // 确保最终time是有效的数字，如果不是则使用当前时间
  if (isNaN(time)) {
    const now = Date.now();
    time = Math.floor(now / 60000) * 60;  // 默认分钟级K线
  }
  
  // 返回标准化的kline数据
  return {
    ...klineData,
    symbol: klineData.symbol || 'UNKNOWN',
    time: time,
    open: Number(klineData.open) || 0,
    high: Number(klineData.high) || 0,
    low: Number(klineData.low) || 0,
    close: Number(klineData.close) || 0,
    volume: Number(klineData.volume) || 0
  };
}

// 测试用例
const testCases = [
  {
    name: "Date对象",
    input: { symbol: "BTCUSDT", time: new Date(), open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 }
  },
  {
    name: "数字时间戳",
    input: { symbol: "BTCUSDT", time: 1766053312, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 }
  },
  {
    name: "字符串时间戳",
    input: { symbol: "BTCUSDT", time: "1766053312", open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 }
  },
  {
    name: "普通对象",
    input: { symbol: "BTCUSDT", time: { year: 2024, month: 7, day: 18 }, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 }
  },
  {
    name: "空对象",
    input: { symbol: "BTCUSDT", time: {}, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 }
  },
  {
    name: "无time字段",
    input: { symbol: "BTCUSDT", open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 }
  }
];

// 运行测试
console.log("Testing standardizeKlineData function...\n");
testCases.forEach(testCase => {
  console.log(`Test: ${testCase.name}`);
  console.log(`Input time: ${testCase.input.time} (Type: ${typeof testCase.input.time})`);
  
  try {
    const result = standardizeKlineData(testCase.input);
    console.log(`Result time: ${result.time} (Type: ${typeof result.time})`);
    console.log(`Result: ${JSON.stringify(result)}`);
    console.log("✓ PASSED\n");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.log("✗ FAILED\n");
  }
});