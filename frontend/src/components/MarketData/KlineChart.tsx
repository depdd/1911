import React, { useEffect, useRef, useState, useCallback } from 'react'
import styled from 'styled-components'
import { createChart, CandlestickData, HistogramData, IChartApi, ISeriesApi, UTCTimestamp, WhitespaceData } from 'lightweight-charts'
import marketService from '@services/marketService'
import { theme } from '../../styles/theme'

interface KlineChartProps {
  symbol: string
  timeframe: string
}

const ChartContainer = styled.div<{ height: number }>`
  position: relative;
  width: 100%;
  height: ${(props) => props.height}px;
  background-color: #0b0e11;
  border-radius: 8px;
  overflow: hidden;
`

const ControlsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(26, 31, 58, 0.6);
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.border};
`

const SymbolSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.sm};
  background: ${theme.colors.backgroundLight};
  color: ${theme.colors.text};
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`

const TimeframeButtons = styled.div`
  display: flex;
  gap: 5px;
`

const TimeframeButton = styled.button<{ isActive: boolean }>(({ theme, isActive }) => ({
  padding: '8px 12px',
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.sm,
  background: isActive ? theme.colors.primary : theme.colors.backgroundLight,
  color: isActive ? theme.colors.text : theme.colors.textTertiary,
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: isActive ? theme.colors.primaryDark : theme.colors.backgroundLighter,
    borderColor: isActive ? theme.colors.primaryDark : theme.colors.borderDark,
  },
  '&:focus': {
    outline: 'none',
    borderColor: theme.colors.primary,
  },
}))

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(19, 23, 42, 0.8);
  border-radius: ${theme.borderRadius.md};
  z-index: 10;
`

// 时间标准化工具函数
const normalizeTime = (time: any): number => {
  if (typeof time === 'number') {
    return time < 10000000000 ? time : Math.floor(time / 1000);
  } else if (time instanceof Date) {
    return Math.floor(time.getTime() / 1000);
  } else if (typeof time === 'string') {
    const date = new Date(time);
    return !isNaN(date.getTime()) ? Math.floor(date.getTime() / 1000) : Math.floor(Date.now() / 1000);
  } else {
    return Math.floor(Date.now() / 1000);
  }
};

const ensureUTCTimestamp = (time: any): UTCTimestamp => {
  return normalizeTime(time) as UTCTimestamp;
};

const KlineChart: React.FC<KlineChartProps> = ({ symbol: initialSymbol, timeframe: initialTimeframe }) => {
  const [symbol, setSymbol] = useState<string>(initialSymbol)
  const [timeframe, setTimeframe] = useState<string>(initialTimeframe)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [symbols, setSymbols] = useState<string[]>(['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'])
  
  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1']
  const [connectionInfo, setConnectionInfo] = useState({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    subscribedSymbols: [] as string[],
  })

  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  
  // 存储当前正在构建的K线
  const currentCandleRef = useRef<{
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  } | null>(null)

  // 存储历史K线数据
  const historicalDataRef = useRef<CandlestickData[]>([])

  // 存储历史成交量数据
  const historicalVolumeDataRef = useRef<HistogramData[]>([])

  // 安全更新图表的函数 - 完全重写版本
  const safeUpdateCandle = useCallback((candle: CandlestickData, volumeData?: HistogramData): boolean => {
    if (!candlestickSeriesRef.current) return false;
    
    try {
      // 获取当前图表中的所有数据
      const currentData = candlestickSeriesRef.current.data() || [];
      
      if (currentData.length === 0) {
        // 如果图表没有数据，直接设置
        candlestickSeriesRef.current.setData([candle]);
        if (volumeData && volumeSeriesRef.current) {
          volumeSeriesRef.current.setData([volumeData]);
        }
        return true;
      }
      
      // 找到要更新的数据点的索引
      const candleTime = normalizeTime(candle.time);
      let dataIndex = -1;
      
      for (let i = currentData.length - 1; i >= 0; i--) {
        const dataItem = currentData[i] as CandlestickData;
        if (normalizeTime(dataItem.time) === candleTime) {
          dataIndex = i;
          break;
        }
      }
      
      if (dataIndex !== -1) {
        // 数据点已存在，直接更新
        candlestickSeriesRef.current.update(candle);
        if (volumeData && volumeSeriesRef.current) {
          volumeSeriesRef.current.update(volumeData);
        }
        return true;
      } else {
        // 数据点不存在，需要添加到正确位置
        // 创建新数组并确保时间顺序
        const newData: (CandlestickData | WhitespaceData)[] = [];
        let inserted = false;
        
        for (const item of currentData) {
          const itemTime = normalizeTime((item as CandlestickData).time);
          
          if (!inserted && candleTime < itemTime) {
            // 在正确位置插入新数据
            newData.push(candle);
            inserted = true;
          }
          
          // 如果时间相同，替换数据（这种情况理论上不会发生，因为上面已经检查过了）
          if (itemTime === candleTime) {
            newData.push(candle);
            inserted = true;
          } else {
            newData.push(item);
          }
        }
        
        // 如果新数据时间最大，添加到末尾
        if (!inserted) {
          newData.push(candle);
        }
        
        // 设置新数据
        candlestickSeriesRef.current.setData(newData);
        
        // 同样处理成交量数据
        if (volumeData && volumeSeriesRef.current) {
          const currentVolumeData = volumeSeriesRef.current.data() || [];
          const newVolumeData: (HistogramData | WhitespaceData)[] = [];
          let volumeInserted = false;
          
          for (const item of currentVolumeData) {
            const itemTime = normalizeTime((item as HistogramData).time);
            
            if (!volumeInserted && candleTime < itemTime) {
              newVolumeData.push(volumeData);
              volumeInserted = true;
            }
            
            if (itemTime === candleTime) {
              newVolumeData.push(volumeData);
              volumeInserted = true;
            } else {
              newVolumeData.push(item);
            }
          }
          
          if (!volumeInserted) {
            newVolumeData.push(volumeData);
          }
          
          volumeSeriesRef.current.setData(newVolumeData);
        }
        
        return true;
      }
    } catch (error: any) {
      console.error('图表更新失败:', error.message);
      
      // 如果所有方法都失败，尝试重新初始化图表
      try {
        // 获取当前所有数据
        const currentData = candlestickSeriesRef.current?.data() || [];
        const currentVolumeData = volumeSeriesRef.current?.data() || [];
        
        // 创建包含新数据的数组
        const allData: (CandlestickData | WhitespaceData)[] = [...currentData];
        const allVolumeData: (HistogramData | WhitespaceData)[] = [...currentVolumeData];
        
        // 按时间排序
        allData.sort((a, b) => 
          normalizeTime((a as CandlestickData).time) - normalizeTime((b as CandlestickData).time)
        );
        
        allVolumeData.sort((a, b) => 
          normalizeTime((a as HistogramData).time) - normalizeTime((b as HistogramData).time)
        );
        
        // 确保新数据被包含
        let hasCandle = false;
        for (const item of allData) {
          if (normalizeTime((item as CandlestickData).time) === normalizeTime(candle.time)) {
            hasCandle = true;
            break;
          }
        }
        
        if (!hasCandle) {
          allData.push(candle);
          allData.sort((a, b) => 
            normalizeTime((a as CandlestickData).time) - normalizeTime((b as CandlestickData).time)
          );
        }
        
        if (volumeData) {
          let hasVolume = false;
          for (const item of allVolumeData) {
            if (normalizeTime((item as HistogramData).time) === normalizeTime(volumeData.time)) {
              hasVolume = true;
              break;
            }
          }
          
          if (!hasVolume) {
            allVolumeData.push(volumeData);
            allVolumeData.sort((a, b) => 
              normalizeTime((a as HistogramData).time) - normalizeTime((b as HistogramData).time)
            );
          }
        }
        
        // 重新设置数据
        candlestickSeriesRef.current?.setData(allData);
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(allVolumeData);
        }
        
        return true;
      } catch (finalError) {
        console.error('最终重试失败:', finalError);
        return false;
      }
    }
  }, [])

  // 获取K线开始时间（秒级时间戳）
  const getCandleTime = useCallback((timestamp: number, tf: string): number => {
    // 确保timestamp是毫秒级
    let msTimestamp: number
    
    if (timestamp < 10000000000) {
      // 秒级时间戳
      msTimestamp = timestamp * 1000
    } else {
      // 毫秒级时间戳
      msTimestamp = timestamp
    }
    
    const date = new Date(msTimestamp)
    
    // 清零毫秒
    date.setUTCMilliseconds(0)
    
    switch (tf) {
      case 'M1':
        date.setUTCSeconds(0, 0)
        break
      case 'M5':
        const minute = date.getUTCMinutes()
        date.setUTCMinutes(Math.floor(minute / 5) * 5, 0, 0)
        break
      case 'M15':
        date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 15) * 15, 0, 0)
        break
      case 'M30':
        date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 30) * 30, 0, 0)
        break
      case 'H1':
        date.setUTCMinutes(0, 0, 0)
        break
      case 'H4':
        const hour = date.getUTCHours()
        date.setUTCHours(Math.floor(hour / 4) * 4, 0, 0, 0)
        break
      case 'D1':
        date.setUTCHours(0, 0, 0, 0)
        break
      case 'W1':
        // 周线：找到本周一的UTC 00:00:00
        const day = date.getUTCDay()
        const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1) // 调整周日的情况
        date.setUTCDate(diff)
        date.setUTCHours(0, 0, 0, 0)
        break
      case 'MN1':
        // 月线：当月第一天的UTC 00:00:00
        date.setUTCDate(1)
        date.setUTCHours(0, 0, 0, 0)
        break
      default:
        date.setUTCSeconds(0, 0)
    }
    
    return Math.floor(date.getTime() / 1000)
  }, [])

  // 处理实时Tick数据 - 修复版
  const handleRealTimeTick = useCallback((tickData: any) => {
    // 只处理当前品种
    if (tickData.symbol !== symbol) return
    
    // 确保图表系列已初始化
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) {
      console.log('图表系列未初始化，跳过tick处理')
      return
    }
    
    // 获取价格和成交量
    const price = (tickData.bid + tickData.ask) / 2
    const volume = tickData.volume_real || tickData.volume || tickData.volumeReal || tickData.amount || 0
    
    // 使用标准化时间函数
    let tickTimeMs: number
    if (tickData.timestamp) {
      tickTimeMs = typeof tickData.timestamp === 'number' ? tickData.timestamp : Number(tickData.timestamp)
    } else if (tickData.time) {
      const timeValue = typeof tickData.time === 'number' ? tickData.time : Number(tickData.time)
      tickTimeMs = timeValue < 10000000000 ? timeValue * 1000 : timeValue
    } else {
      tickTimeMs = Date.now()
    }
    
    // 计算当前tick对应的K线时间
    const candleTime = getCandleTime(tickTimeMs, timeframe)
    
    // 使用标准化时间进行比较
    const normalizedCandleTime = normalizeTime(candleTime)
    const currentCandleTime = currentCandleRef.current ? normalizeTime(currentCandleRef.current.time) : null
    
    console.log('处理tick数据:', {
      symbol: tickData.symbol,
      price: price,
      candleTime: candleTime,
      normalizedCandleTime: normalizedCandleTime,
      currentCandleTime: currentCandleTime,
      isNewCandle: !currentCandleRef.current || normalizedCandleTime !== currentCandleTime
    })
    
    // 检查是否是新的K线
    if (!currentCandleRef.current || normalizedCandleTime !== currentCandleTime) {
      console.log(`新K线开始: ${normalizedCandleTime}, 前一个: ${currentCandleTime}`)
      
      // 如果存在上一根K线，将其添加到历史数据
      if (currentCandleRef.current) {
        const completedCandleTime = ensureUTCTimestamp(currentCandleRef.current.time)
        
        const completedCandle: CandlestickData = {
          time: completedCandleTime,
          open: currentCandleRef.current.open,
          high: currentCandleRef.current.high,
          low: currentCandleRef.current.low,
          close: currentCandleRef.current.close
        }
        
        const completedVolumeData: HistogramData = {
          time: completedCandleTime,
          value: currentCandleRef.current.volume,
          color: currentCandleRef.current.close >= currentCandleRef.current.open ? '#26a69a' : '#ef5350'
        }
        
        // 添加到历史数据
        historicalDataRef.current.push(completedCandle)
        historicalVolumeDataRef.current.push(completedVolumeData)
        
        // 安全更新图表中的历史K线
        const updateSuccess = safeUpdateCandle(completedCandle, completedVolumeData)
        
        if (!updateSuccess) {
          console.error('更新历史K线失败，可能需要重新初始化图表')
        }
        
        console.log(`完成K线: ${currentCandleRef.current.time}`, {
          open: completedCandle.open,
          high: completedCandle.high,
          low: completedCandle.low,
          close: completedCandle.close
        })
      }
      
      // 开始新的K线
      currentCandleRef.current = {
        time: normalizedCandleTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume
      }
      
      console.log(`开始新K线: ${normalizedCandleTime}`, {
        open: price,
        high: price,
        low: price,
        close: price
      })
      
      // 在图表上创建新的K线
      const newCandle: CandlestickData = {
        time: ensureUTCTimestamp(normalizedCandleTime),
        open: price,
        high: price,
        low: price,
        close: price
      }
      
      const newVolumeData: HistogramData = {
        time: ensureUTCTimestamp(normalizedCandleTime),
        value: volume,
        color: '#26a69a'
      }
      
      // 使用安全更新方法
      const createSuccess = safeUpdateCandle(newCandle, newVolumeData)
      
      if (!createSuccess) {
        console.error('创建新K线失败')
      }
    } else {
      // 更新当前K线的实时数据
      console.log('更新当前K线:', {
        currentTime: currentCandleRef.current.time,
        price: price,
        currentHigh: currentCandleRef.current.high,
        currentLow: currentCandleRef.current.low,
        currentClose: currentCandleRef.current.close
      })
      
      // 更新K线数据
      if (currentCandleRef.current) {
        currentCandleRef.current.high = Math.max(currentCandleRef.current.high, price)
        currentCandleRef.current.low = Math.min(currentCandleRef.current.low, price)
        currentCandleRef.current.close = price
        currentCandleRef.current.volume += volume
        
        // 更新图表上的当前K线
        const updatedCandle: CandlestickData = {
          time: ensureUTCTimestamp(normalizedCandleTime),
          open: currentCandleRef.current.open,
          high: currentCandleRef.current.high,
          low: currentCandleRef.current.low,
          close: currentCandleRef.current.close
        }
        
        const updatedVolumeData: HistogramData = {
          time: ensureUTCTimestamp(normalizedCandleTime),
          value: currentCandleRef.current.volume,
          color: currentCandleRef.current.open <= currentCandleRef.current.close ? '#26a69a' : '#ef5350'
        }
        
        // 使用安全更新方法
        const updateSuccess = safeUpdateCandle(updatedCandle, updatedVolumeData)
        
        if (!updateSuccess) {
          console.error('更新当前K线失败')
        }
      }
    }
  }, [symbol, timeframe, getCandleTime, safeUpdateCandle])

  // 初始化图表
  useEffect(() => {
    console.log('初始化图表...')
    
    if (!chartContainerRef.current) return
    
    try {
      // 清理旧的图表
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (error) {
          console.warn('清理图表时出现错误，可能图表已经被销毁:', error)
        }
        chartRef.current = null
      }
      
      // 获取容器尺寸
      const containerWidth = chartContainerRef.current.clientWidth
      const containerHeight = chartContainerRef.current.clientHeight
      
      // 创建新图表
      const chart = createChart(chartContainerRef.current, {
        width: containerWidth,
        height: containerHeight,
        layout: {
          background: { color: '#0B0E11' },
          textColor: '#D1D4DC'
        },
        grid: {
          vertLines: { color: '#1E2235' },
          horzLines: { color: '#1E2235' }
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: timeframe.includes('M') || timeframe === 'H1',
          borderColor: '#2B2B43',
          tickMarkFormatter: (time: number) => {
            const date = new Date(time * 1000)
            const year = date.getUTCFullYear()
            const month = String(date.getUTCMonth() + 1).padStart(2, '0')
            const day = String(date.getUTCDate()).padStart(2, '0')
            const hour = String(date.getUTCHours()).padStart(2, '0')
            const minute = String(date.getUTCMinutes()).padStart(2, '0')
            
            if (timeframe === 'D1' || timeframe === 'W1' || timeframe === 'MN1') {
              return `${year}-${month}-${day}`
            } else {
              return `${year}-${month}-${day} ${hour}:${minute}`
            }
          }
        },
        crosshair: {
          mode: 1,
          vertLine: {
            width: 1,
            color: '#758696',
            style: 3,
            labelBackgroundColor: '#3d3d3d',
          },
          horzLine: {
            width: 1,
            color: '#758696',
            style: 3,
            labelBackgroundColor: '#3d3d3d',
          },
        },
      })
      
      chartRef.current = chart
      
      // 设置价格精度
      let pricePrecision = 5
      let minMove = 0.00001
      
      if (symbol === 'BTCUSD' || symbol === 'XAUUSD') {
        pricePrecision = 2
        minMove = 0.01
      }
      
      // 创建蜡烛图系列
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: true,
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        priceFormat: {
          type: 'price',
          precision: pricePrecision,
          minMove: minMove,
        },
      })
      candlestickSeriesRef.current = candlestickSeries
      
      // 创建成交量系列
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      })
      volumeSeriesRef.current = volumeSeries
      
      // 设置成交量图表的位置
      chart.priceScale('').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })
      
      console.log('图表初始化完成')
      
      return () => {
        console.log('清理图表')
        if (chart) {
          chart.remove()
        }
      }
    } catch (error) {
      console.error('图表初始化错误:', error)
    }
  }, [symbol, timeframe])

  // 获取历史K线数据
  useEffect(() => {
    const fetchKlineData = async () => {
      console.log('获取历史K线数据...')
      
      setIsLoading(true)
      
      try {
        const response = await marketService.getHistoryKlineData(symbol, timeframe, 200)
        
        if (response.success && response.data?.data) {
          console.log(`获取到 ${response.data.data.length} 条历史K线数据`)
          
          // 重置当前K线和历史数据
          currentCandleRef.current = null
          historicalDataRef.current = []
          historicalVolumeDataRef.current = []
          
          // 准备蜡烛图数据
          const candles: CandlestickData[] = []
          const volumes: HistogramData[] = []
          
          response.data.data.forEach((item: any) => {
            // 使用标准化时间函数
            const time = normalizeTime(item.time)
            
            // 确保所有价格和成交量都转换为数字格式
            const openPrice = Number(item.open)
            const highPrice = Number(item.high)
            const lowPrice = Number(item.low)
            const closePrice = Number(item.close)
            const vol = Number(item.real_volume) || Number(item.volume_real) || Number(item.realVolume) || Number(item.volume) || 0
            
            candles.push({
              time: ensureUTCTimestamp(time),
              open: openPrice,
              high: highPrice,
              low: lowPrice,
              close: closePrice,
            })
            
            volumes.push({
              time: ensureUTCTimestamp(time),
              value: vol,
              color: closePrice >= openPrice ? '#26a69a' : '#ef5350',
            })
          })
          
          // 确保蜡烛图数据按时间排序
          candles.sort((a, b) => normalizeTime(a.time) - normalizeTime(b.time))
          volumes.sort((a, b) => normalizeTime(a.time) - normalizeTime(b.time))
          
          // 设置历史数据
          historicalDataRef.current = candles
          historicalVolumeDataRef.current = volumes
          
          // 如果有数据，设置最后一根为当前K线
          if (candles.length > 0) {
            const lastCandle = candles[candles.length - 1]
            currentCandleRef.current = {
              time: normalizeTime(lastCandle.time),
              open: lastCandle.open,
              high: lastCandle.high,
              low: lastCandle.low,
              close: lastCandle.close,
              volume: volumes[volumes.length - 1]?.value || 0
            }
          }
          
          // 更新图表
          if (candlestickSeriesRef.current && volumeSeriesRef.current) {
            candlestickSeriesRef.current.setData(candles)
            volumeSeriesRef.current.setData(volumes)
            
            // 调整视图
            if (chartRef.current) {
              chartRef.current.timeScale().fitContent()
            }
            
            console.log('历史K线数据已设置到图表')
          }
        } else {
          console.error('历史K线数据获取失败:', response.error)
        }
      } catch (error) {
        console.error('获取历史K线数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchKlineData()
  }, [symbol, timeframe])

  // 处理实时K线数据
  const handleRealTimeKline = useCallback((klineData: any) => {
    // 只处理当前品种
    if (klineData.symbol !== symbol) return
    
    // 确保图表系列已初始化
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return
    
    // 优先使用转换后的成交量单位，与历史数据保持一致
    const klineVolume = Number(klineData.volume_real) || Number(klineData.volume) || Number(klineData.volumeReal) || Number(klineData.real_volume) || Number(klineData.realVolume) || 0
    
    console.log('处理实时K线数据:', {
      ...klineData,
      originalVolume: klineData.volume,
      processedVolume: klineVolume
    })
    
    // 使用标准化时间
    const candleTime = normalizeTime(klineData.time)
    const currentCandleTime = currentCandleRef.current ? normalizeTime(currentCandleRef.current.time) : null
    
    // 如果当前没有K线或时间不同，开始新的K线
    if (!currentCandleRef.current || candleTime !== currentCandleTime) {
      // 如果存在上一根K线，将其添加到历史数据
      if (currentCandleRef.current) {
        const completedCandle: CandlestickData = {
          time: ensureUTCTimestamp(currentCandleRef.current.time),
          open: currentCandleRef.current.open,
          high: currentCandleRef.current.high,
          low: currentCandleRef.current.low,
          close: currentCandleRef.current.close
        }
        
        const completedVolumeData: HistogramData = {
          time: ensureUTCTimestamp(currentCandleRef.current.time),
          value: currentCandleRef.current.volume,
          color: currentCandleRef.current.close >= currentCandleRef.current.open ? '#26a69a' : '#ef5350'
        }
        
        historicalDataRef.current.push(completedCandle)
        historicalVolumeDataRef.current.push(completedVolumeData)
        
        // 使用安全更新方法
        safeUpdateCandle(completedCandle, completedVolumeData)
      }
      
      // 开始新的K线
      currentCandleRef.current = {
        time: candleTime,
        open: klineData.open,
        high: klineData.high,
        low: klineData.low,
        close: klineData.close,
        volume: klineVolume
      }
      
      // 在图表上创建新的K线
      const newCandle: CandlestickData = {
        time: ensureUTCTimestamp(candleTime),
        open: klineData.open,
        high: klineData.high,
        low: klineData.low,
        close: klineData.close
      }
      
      const newVolumeData: HistogramData = {
        time: ensureUTCTimestamp(candleTime),
        value: klineVolume,
        color: klineData.close >= klineData.open ? '#26a69a' : '#ef5350'
      }
      
      // 使用安全更新方法
      safeUpdateCandle(newCandle, newVolumeData)
    } else {
      // 更新当前K线
      if (currentCandleRef.current) {
        currentCandleRef.current.high = Math.max(currentCandleRef.current.high, klineData.high)
        currentCandleRef.current.low = Math.min(currentCandleRef.current.low, klineData.low)
        currentCandleRef.current.close = klineData.close
        currentCandleRef.current.volume += klineVolume
        
        // 更新图表上的当前K线
        const updatedCandle: CandlestickData = {
          time: ensureUTCTimestamp(candleTime),
          open: currentCandleRef.current.open,
          high: currentCandleRef.current.high,
          low: currentCandleRef.current.low,
          close: currentCandleRef.current.close
        }
        
        const updatedVolumeData: HistogramData = {
          time: ensureUTCTimestamp(candleTime),
          value: currentCandleRef.current.volume,
          color: currentCandleRef.current.close >= currentCandleRef.current.open ? '#26a69a' : '#ef5350'
        }
        
        safeUpdateCandle(updatedCandle, updatedVolumeData)
      }
    }
  }, [symbol, safeUpdateCandle])

  // WebSocket连接管理
  useEffect(() => {
    console.log('设置WebSocket连接...')
    
    const unsubTick = marketService.onTick(handleRealTimeTick)
    const unsubKline = marketService.onKline(handleRealTimeKline)
    const unsubConnect = marketService.onConnect(() => {
      console.log('WebSocket连接成功')
      setConnectionInfo(marketService.getConnectionInfo())
    })
    const unsubDisconnect = marketService.onDisconnect(() => {
      console.log('WebSocket连接断开')
      setConnectionInfo(marketService.getConnectionInfo())
    })
    const unsubError = marketService.onError((error) => {
      console.error('WebSocket错误:', error)
    })
    
    setConnectionInfo(marketService.getConnectionInfo())
    
    // 订阅当前品种和时间框架
    marketService.subscribeToSymbol(symbol, timeframe)
    
    return () => {
      console.log('清理WebSocket订阅...')
      unsubTick()
      unsubKline()
      unsubConnect()
      unsubDisconnect()
      unsubError()
      marketService.unsubscribeFromSymbol(symbol, timeframe)
    }
  }, [symbol, timeframe, handleRealTimeTick, handleRealTimeKline])

  // 获取交易品种列表
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await marketService.getSymbols()
        if (response.success && response.data) {
          setSymbols(response.data.all_symbols)
        }
      } catch (error) {
        console.error('获取交易品种列表失败:', error)
      }
    }
    
    fetchSymbols()
  }, [])

  // 窗口大小调整
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        const containerWidth = chartContainerRef.current.clientWidth
        const containerHeight = chartContainerRef.current.clientHeight
        chartRef.current.applyOptions({ width: containerWidth, height: containerHeight })
      }
    }
    
    window.addEventListener('resize', handleResize)
    handleResize()
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 处理品种切换
  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSymbol = e.target.value
    console.log('切换品种:', newSymbol)
    setSymbol(newSymbol)
  }

  // 处理时间周期切换
  const handleTimeframeChange = (newTimeframe: string) => {
    console.log('切换时间周期:', newTimeframe)
    setTimeframe(newTimeframe)
  }

  const connectionStatus = connectionInfo.isConnected ? 'connected' : 
                           connectionInfo.isConnecting ? 'connecting' : 'disconnected'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <ControlsContainer>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SymbolSelect value={symbol} onChange={handleSymbolChange}>
            {symbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </SymbolSelect>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 10px',
            borderRadius: '4px',
            background: connectionStatus === 'connected' ? '#26a69a20' : 
                       connectionStatus === 'connecting' ? '#ffb74d20' : '#ef535020',
            border: `1px solid ${connectionStatus === 'connected' ? '#26a69a' : 
                     connectionStatus === 'connecting' ? '#ffb74d' : '#ef5350'}`
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connectionStatus === 'connected' ? '#26a69a' : 
                         connectionStatus === 'connecting' ? '#ffb74d' : '#ef5350',
              animation: connectionStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none'
            }} />
            <span style={{
              fontSize: '12px',
              color: connectionStatus === 'connected' ? '#26a69a' : 
                     connectionStatus === 'connecting' ? '#ffb74d' : '#ef5350'
            }}>
              {connectionStatus === 'connected' ? '已连接' : 
               connectionStatus === 'connecting' ? '连接中...' : '已断开'}
            </span>
          </div>
          
          <button
            onClick={() => marketService.reconnect()}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              backgroundColor: '#2c3e50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            重连
          </button>
        </div>
        
        <TimeframeButtons>
          {timeframes.map(tf => (
            <TimeframeButton
              key={tf}
              isActive={timeframe === tf}
              onClick={() => handleTimeframeChange(tf)}
            >
              {tf}
            </TimeframeButton>
          ))}
        </TimeframeButtons>
      </ControlsContainer>
      
      <ChartContainer height={400} ref={chartContainerRef}>
        {isLoading && (
          <LoadingOverlay>
            <div>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid rgba(255, 255, 255, 0.1)',
                borderLeftColor: '#26a69a',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ marginTop: '12px', color: theme.colors.text }}>加载中...</p>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                  0% { opacity: 1; }
                  50% { opacity: 0.5; }
                  100% { opacity: 1; }
                }
              `}</style>
            </div>
          </LoadingOverlay>
        )}
      </ChartContainer>
    </div>
  )
}

export default KlineChart