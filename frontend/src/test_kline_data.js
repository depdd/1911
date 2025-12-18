// Test script for standardizeKlineData method

// Implement the standardizeKlineData method directly for testing
function standardizeKlineData(kline) {
  let time;
  
  // Handle different time formats
  if (typeof kline.time === 'object' && kline.time instanceof Date) {
    time = kline.time.getTime() / 1000; // Convert Date object to Unix timestamp in seconds
  } else if (typeof kline.time === 'string') {
    time = new Date(kline.time).getTime() / 1000; // Convert string to Unix timestamp in seconds
  } else if (typeof kline.time === 'number') {
    time = kline.time; // Already a number, use as is
  } else {
    // Default to current time if time is invalid
    time = Math.floor(Date.now() / 1000);
  }

  // Standardize the kline data
  return {
    time: Number(time), // Ensure it's a number
    open: Number(kline.open) || 0,
    high: Number(kline.high) || 0,
    low: Number(kline.low) || 0,
    close: Number(kline.close) || 0,
    volume: Number(kline.volume) || 0
  };
}

// Create a mock KlineData object with time as object
const mockKlineDataWithObjectTime = {
  symbol: 'EURUSD',
  time: new Date(), // This is an object
  open: 1.1234,
  high: 1.1256,
  low: 1.1212,
  close: 1.1245,
  volume: 1000
};

// Create a mock KlineData object with string time
const mockKlineDataWithStringTime = {
  symbol: 'EURUSD',
  time: '2023-12-18T12:00:00Z', // This is a string
  open: 1.1234,
  high: 1.1256,
  low: 1.1212,
  close: 1.1245,
  volume: 1000
};

// Create a mock KlineData object with numeric time
const mockKlineDataWithNumericTime = {
  symbol: 'EURUSD',
  time: 1702905600, // This is a number (Unix timestamp)
  open: 1.1234,
  high: 1.1256,
  low: 1.1212,
  close: 1.1245,
  volume: 1000
};

// Test the standardizeKlineData function
console.log('Testing standardizeKlineData function...');
console.log('\n1. Testing with object time:', mockKlineDataWithObjectTime.time);
const standardized1 = standardizeKlineData(mockKlineDataWithObjectTime);
console.log('Result:', standardized1.time, typeof standardized1.time);

console.log('\n2. Testing with string time:', mockKlineDataWithStringTime.time);
const standardized2 = standardizeKlineData(mockKlineDataWithStringTime);
console.log('Result:', standardized2.time, typeof standardized2.time);

console.log('\n3. Testing with numeric time:', mockKlineDataWithNumericTime.time);
const standardized3 = standardizeKlineData(mockKlineDataWithNumericTime);
console.log('Result:', standardized3.time, typeof standardized3.time);

// Test with the exact error case from the bug report
console.log('\n4. Testing with [object Object] scenario:');
const mockKlineDataWithObjectObjectTime = {
  symbol: 'EURUSD',
  time: { toString: () => '[object Object]' }, // Simulate the error case
  open: 1.1234,
  high: 1.1256,
  low: 1.1212,
  close: 1.1245,
  volume: 1000
};
const standardized4 = standardizeKlineData(mockKlineDataWithObjectObjectTime);
console.log('Result:', standardized4.time, typeof standardized4.time);

console.log('\nAll tests completed!');