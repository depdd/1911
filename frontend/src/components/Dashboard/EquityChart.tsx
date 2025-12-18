import React, { useMemo } from 'react'
import { Trade } from '../../types'

interface EquityPoint {
  x: number
  y: number
  date: string
}

interface EquityChartProps {
  trades?: Trade[]
}

// 优化后的资金曲线图组件
const EquityChart: React.FC<EquityChartProps> = React.memo(({ trades }) => {
  // 生成随机但有趋势的数据点（作为后备）
  const generateDataPoints = useMemo((): EquityPoint[] => {
    const points = [];
    let value = 10000; // 起始资金
    const today = new Date();
    
    for (let i = 10; i >= 0; i--) {
      // 添加一些随机波动，但保持整体上升趋势
      const change = Math.random() * 800 - 300;
      value = Math.max(value + change, 8000); // 确保不会低于8000
      
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      points.push({
        x: ((10 - i) / 10) * 100, // 百分比位置
        y: value,
        date: `${date.getMonth() + 1}/${date.getDate().toString().padStart(2, '0')}`
      });
    }
    
    return points;
  }, []); // 模拟数据不会变化，不需要依赖项
  
  // 从交易历史计算资金曲线数据
  const calculateEquityFromTrades = useMemo((): EquityPoint[] => {
    if (!trades || trades.length === 0) return [];
    
    // 按时间排序交易
    const sortedTrades = [...trades].sort((a, b) => new Date(a.tradeTime).getTime() - new Date(b.tradeTime).getTime());
    
    const equityMap = new Map<string, number>();
    let currentEquity = 10000; // 假设起始资金为10000
    
    // 按日期分组并计算累积盈亏
    sortedTrades.forEach(trade => {
      const dateKey = new Date(trade.tradeTime).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
      
      // 计算该交易的盈亏
      const tradeProfit = typeof trade.profit === 'number' ? trade.profit : parseFloat(trade.profit || '0');
      currentEquity += tradeProfit;
      
      // 更新当天的最终权益
      equityMap.set(dateKey, currentEquity);
    });
    
    // 转换为图表数据格式
    const equityPoints = Array.from(equityMap.entries()).map(([date, equity], index) => ({
      x: (index / (equityMap.size - 1)) * 100,
      y: equity,
      date
    }));
    
    return equityPoints;
  }, [trades]); // 只在trades变化时重新计算
  
  // 使用真实数据或模拟数据
  const equityPoints = useMemo(() => {
    return calculateEquityFromTrades.length > 0 ? calculateEquityFromTrades : generateDataPoints;
  }, [calculateEquityFromTrades, generateDataPoints]);
  
  // 计算数据范围
  const dataRange = useMemo(() => {
    if (equityPoints.length === 0) return { minValue: 0, maxValue: 10000, valueRange: 10000 };
    
    const values = equityPoints.map(p => p.y);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;
    
    return { minValue, maxValue, valueRange };
  }, [equityPoints]);
  
  // 计算SVG路径
  const createPath = useMemo(() => {
    if (equityPoints.length === 0) return '';
    
    const { minValue, valueRange } = dataRange;
    
    return equityPoints.map((point, index) => {
      // 转换y坐标到SVG坐标系（翻转并映射到图表高度）
      const y = 100 - ((point.y - minValue) / (valueRange || 1)) * 80; // 映射到20%-100%高度，避免除以0
      return `${index === 0 ? 'M' : 'L'}${point.x},${y}`;
    }).join(' ');
  }, [equityPoints, dataRange]);
  
  // 计算Y轴标签值
  const yAxisLabels = useMemo(() => {
    const { minValue, valueRange } = dataRange;
    
    return [0.2, 0.4, 0.6, 0.8].map(pos => {
      const value = minValue + valueRange * (1 - pos);
      return Math.round(value);
    });
  }, [dataRange]);
  
  // 计算总收益率
  const totalReturn = useMemo(() => {
    if (equityPoints.length < 2) return 0;
    
    const firstValue = equityPoints[0].y;
    const lastValue = equityPoints[equityPoints.length - 1].y;
    
    return ((lastValue - firstValue) / (firstValue || 1)) * 100; // 避免除以0
  }, [equityPoints]);
  
  // 确定需要显示的日期标签，避免过于密集
  const dateLabelsToShow = useMemo(() => {
    if (equityPoints.length <= 5) {
      // 如果数据点少于等于5个，显示所有标签
      return equityPoints;
    } else {
      // 对于更多数据点，只显示重要的标签（如第一个、最后一个和中间的几个）
      const step = Math.ceil(equityPoints.length / 5); // 最多显示5个标签
      return equityPoints.filter((_, index) => index % step === 0 || index === equityPoints.length - 1);
    }
  }, [equityPoints]);
  
  return (
    <div style={{ 
      padding: '16px', 
      borderRadius: '12px',
      backgroundColor: '#1a1f3a',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      width: '100%',
      maxWidth: '1200px'
    }}>
      {/* 图表标题栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid #334166'
      }}>
        <h3 style={{ 
          color: '#ffffff', 
          fontSize: '18px', 
          fontWeight: 600,
          margin: 0
        }}>账户资金曲线</h3>
        <div style={{ 
          fontSize: '14px', 
          color: totalReturn >= 0 ? '#00ff88' : '#ff4d4f',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '8px' }}>总收益: {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path 
              d={totalReturn >= 0 ? "M8 3L12 7H9V13H7V7H4L8 3Z" : "M8 13L4 9H7V3H9V9H12L8 13Z"}
              fill={totalReturn >= 0 ? "#00ff88" : "#ff4d4f"}
            />
          </svg>
        </div>
      </div>
      
      {/* 图表容器 */}
      <div 
        style={{
          width: '100%',
          height: '400px',
          backgroundColor: 'transparent',
          position: 'relative',
          overflow: 'hidden',
          padding: '40px 40px 60px 60px' // 为标签留出空间
        }}
      >
        {/* 背景网格线 - 更细更暗 */}
        {[20, 40, 60, 80].map((pos, index) => (
          <React.Fragment key={`h-${pos}`}>
            <div style={{ 
              position: 'absolute', 
              top: `${pos}%`, 
              left: '60px', 
              right: '40px', 
              height: '1px', 
              backgroundColor: 'rgba(51, 65, 102, 0.3)',
              transform: 'translateY(-50%)'
            }} />
            {/* Y轴标签 */}
            <div style={{ 
              position: 'absolute', 
              left: 0, 
              top: `${pos}%`, 
              fontSize: '13px', 
              color: '#8a95b7',
              transform: 'translate(-100%, -50%)',
              textAlign: 'right',
              width: '50px',
              fontWeight: 500
            }}>
              {yAxisLabels[index]?.toLocaleString('zh-CN') || ''}
            </div>
          </React.Fragment>
        ))}
        
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pos) => (
          <React.Fragment key={`v-${pos}`}>
            <div style={{ 
              position: 'absolute', 
              left: `${pos}%`, 
              top: '40px', 
              bottom: '60px', 
              width: '1px', 
              backgroundColor: 'rgba(51, 65, 102, 0.3)',
              transform: 'translateX(-50%)'
            }} />
          </React.Fragment>
        ))}
        
        {/* 数据线条和区域 - 使用SVG */}
        <svg style={{ 
          position: 'absolute', 
          top: '40px', 
          left: '60px', 
          width: `calc(100% - 100px)`, 
          height: `calc(100% - 100px)`
        }}>
          {/* 填充区域 */}
          <path 
            d={`${createPath} L100,100 L0,100 Z`}
            fill="url(#colorGradient)"
            opacity="0.2"
          />
          
          {/* 渐变定义 */}
          <defs>
            <linearGradient id="colorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* 主线条 */}
          <path 
            d={createPath}
            fill="none"
            stroke="#00ff88"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* 数据点 */}
          {equityPoints.map((point, index) => {
            const { minValue, valueRange } = dataRange;
            const y = 100 - ((point.y - minValue) / (valueRange || 1)) * 80;
            return (
              <g key={`point-${index}`}>
                <circle 
                  cx={point.x} 
                  cy={y} 
                  r="4" 
                  fill="#00ff88" 
                  stroke="#1a1f3a"
                  strokeWidth="2"
                />
                {/* 悬停效果（通过CSS实现） */}
                <circle 
                  cx={point.x} 
                  cy={y} 
                  r="8" 
                  fill="transparent"
                  stroke="#00ff88"
                  strokeWidth="1"
                  style={{ opacity: 0.3 }}
                />
              </g>
            );
          })}
        </svg>
        
        {/* X轴日期标签 */}
        {dateLabelsToShow.map((point, index) => (
          <div 
            key={`date-${index}`}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${point.x}%`,
              fontSize: '13px',
              color: '#8a95b7',
              transform: 'translate(-50%, 10px)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              maxWidth: '100px',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}
          >
            {point.date}
          </div>
        ))}
        
        {/* 最新值提示 */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '8px 12px',
          backgroundColor: 'rgba(26, 31, 58, 0.9)',
          borderRadius: '6px',
          border: '1px solid #334166',
          fontSize: '14px',
          fontWeight: 500,
          color: '#ffffff'
        }}>
          最新资金: ¥{equityPoints[equityPoints.length - 1]?.y.toLocaleString('zh-CN') || '0'}
        </div>
      </div>
    </div>
  )
});

export default EquityChart;