import React, { useEffect, useRef, useState, useCallback } from 'react'
import styled from 'styled-components'
import { createChart, CandlestickData, HistogramData, IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import { KlineData } from '../../types'
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

const TimeframeButton = styled.button<{ isActive: boolean }>`
  padding: 8px 12px;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.borderRadius.sm};
  background: ${props => props.isActive ? theme.colors.primary : theme.colors.backgroundLight};
  color: ${props => props.isActive ? theme.colors.text : theme.colors.textTertiary};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.isActive ? theme.colors.primaryDark : theme.colors.backgroundLighter};
    border-color: ${props => props.isActive ? theme.colors.primaryDark : theme.colors.borderDark};
  }

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`

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
    date.setMilliseconds(0)
    
    switch (tf) {
      case 'M1':
        date.setSeconds(0)
        break
      case 'M5':
        const minute = date.getMinutes()
        date.setMinutes(Math.floor(minute / 5) * 5, 0, 0)
        break
      case 'M15':
        date.setMinutes(Math.floor(date.getMinutes() / 15) * 15, 0, 0)
        break
      case 'M30':
        date.setMinutes(Math.floor(date.getMinutes() / 30) * 30, 0, 0)
        break
      case 'H1':
        date.setMinutes(0, 0, 0)
        break
      case 'H4':
        const hour = date.getHours()
        date.setHours(Math.floor(hour / 4) * 4, 0, 0, 0)
        break
      case 'D1':
        date.setHours(0, 0, 0, 0)
        break
      default:
        date.setSeconds(0, 0)
    }
    
    return Math.floor(date.getTime() / 1000)
  }, [])

  // 处理实时Tick数据 - 修复版
  const handleRealTimeTick = useCallback((tickData: any) => {
    // 只处理当前品种
    if (tickData.symbol !== symbol) return
    
    // 确保图表系列已初始化
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return
    
    // 获取价格和成交量
    const price = (tickData.bid + tickData.ask) / 2
    const volume = tickData.volume || 0
    
    // 使用tickData中的时间（秒级时间戳）
    const tickTime = tickData.time || Math.floor(Date.now() / 1000)
    
    // 计算当前tick对应的K线时间
    const candleTime = getCandleTime(tickTime * 1000, timeframe)
    
    console.log('处理tick数据:', {
      symbol: tickData.symbol,
      price: price,
      tickTime: tickTime,
      candleTime: candleTime,
      currentCandleTime: currentCandleRef.current?.time
    })
    
    // 检查是否是新的K线
    if (!currentCandleRef.current || currentCandleRef.current.time !== candleTime) {
      console.log(`新K线开始: ${candleTime}, 前一个: ${currentCandleRef.current?.time}`)
      
      // 如果存在上一根K线，将其添加到历史数据
      if (currentCandleRef.current) {
        const completedCandle: CandlestickData = {
          time: currentCandleRef.current.time as Time,
          open: currentCandleRef.current.open,
          high: currentCandleRef.current.high,
          low: currentCandleRef.current.low,
          close: currentCandleRef.current.close
        }
        
        historicalDataRef.current.push(completedCandle)
        
        // 更新图表中的历史K线（确保引线正确）
        candlestickSeriesRef.current.update(completedCandle)
        
        console.log(`完成K线: ${currentCandleRef.current.time}`, {
          open: completedCandle.open,
          high: completedCandle.high,
          low: completedCandle.low,
          close: completedCandle.close
        })
      }
      
      // 开始新的K线
      currentCandleRef.current = {
        time: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume
      }
      
      console.log(`开始新K线: ${candleTime}`, {
        open: price,
        high: price,
        low: price,
        close: price
      })
      
      // 在图表上创建新的K线
      try {
        const newCandle: CandlestickData = {
          time: candleTime as Time,
          open: price,
          high: price,
          low: price,
          close: price
        }
        
        candlestickSeriesRef.current.update(newCandle)
        
        // 更新成交量
        const newVolumeData = {
          time: candleTime as Time,
          value: volume,
          color: price >= price ? '#26a69a' : '#ef5350' // 开盘价等于收盘价，默认绿色
        }
        volumeSeriesRef.current.update(newVolumeData)
      } catch (error) {
        console.error('创建新K线时出错:', error)
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
      currentCandleRef.current.high = Math.max(currentCandleRef.current.high, price)
      currentCandleRef.current.low = Math.min(currentCandleRef.current.low, price)
      currentCandleRef.current.close = price
      currentCandleRef.current.volume += volume
      
      // 更新图表上的当前K线
      try {
        const updatedCandle: CandlestickData = {
          time: candleTime as Time,
          open: currentCandleRef.current.open,
          high: currentCandleRef.current.high,
          low: currentCandleRef.current.low,
          close: currentCandleRef.current.close
        }
        
        candlestickSeriesRef.current.update(updatedCandle)
        
        // 更新成交量
        const updatedVolumeData = {
          time: candleTime as Time,
          value: currentCandleRef.current.volume,
          color: currentCandleRef.current.close >= currentCandleRef.current.open ? '#26a69a' : '#ef5350'
        }
        volumeSeriesRef.current.update(updatedVolumeData)
      } catch (error) {
        console.error('更新当前K线时出错:', error)
      }
    }
  }, [symbol, timeframe, getCandleTime])

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
            // 使用本地时间格式，与MT5保持一致
            return date.toLocaleString('zh-CN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
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
      
      // 创建蜡烛图系列 - 关键：确保正确配置引线颜色
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
          
          // 准备蜡烛图数据
          const candles: CandlestickData[] = []
          const volumes: HistogramData[] = []
          
          response.data.data.forEach((item: KlineData) => {
            let time: number
            
            if (typeof item.time === 'number') {
              time = item.time > 10000000000 ? Math.floor(item.time / 1000) : item.time
            } else if (typeof item.time === 'string') {
              const date = new Date(item.time)
              time = Math.floor(date.getTime() / 1000)
            } else {
              time = Math.floor(Date.now() / 1000)
            }
            
            candles.push({
              time: time as Time,
              open: Number(item.open),
              high: Number(item.high),
              low: Number(item.low),
              close: Number(item.close),
            })
            
            volumes.push({
              time: time as Time,
              value: Number(item.volume),
              color: item.close >= item.open ? '#26a69a' : '#ef5350',
            })
          })
          
          // 设置历史数据
          historicalDataRef.current = candles
          
          // 如果有数据，设置最后一根为当前K线
          if (candles.length > 0) {
            const lastCandle = candles[candles.length - 1]
            currentCandleRef.current = {
              time: Number(lastCandle.time),
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
    
    console.log('处理实时K线数据:', klineData)
    
    // 更新当前K线或添加新K线
    const candleTime = klineData.time
    
    // 如果当前没有K线或时间不同，开始新的K线
    if (!currentCandleRef.current || currentCandleRef.current.time !== candleTime) {
      // 如果存在上一根K线，将其添加到历史数据
      if (currentCandleRef.current) {
        const completedCandle: CandlestickData = {
          time: currentCandleRef.current.time as Time,
          open: currentCandleRef.current.open,
          high: currentCandleRef.current.high,
          low: currentCandleRef.current.low,
          close: currentCandleRef.current.close
        }
        
        historicalDataRef.current.push(completedCandle)
        
        // 更新图表中的历史K线
        candlestickSeriesRef.current.update(completedCandle)
        
        // 更新成交量
        const volumeData = {
          time: currentCandleRef.current.time as Time,
          value: currentCandleRef.current.volume,
          color: currentCandleRef.current.close >= currentCandleRef.current.open ? '#26a69a' : '#ef5350'
        }
        volumeSeriesRef.current.update(volumeData)
      }
      
      // 开始新的K线
      currentCandleRef.current = {
        time: candleTime,
        open: klineData.open,
        high: klineData.high,
        low: klineData.low,
        close: klineData.close,
        volume: klineData.volume
      }
      
      // 在图表上创建新的K线
      const newCandle: CandlestickData = {
        time: candleTime as Time,
        open: klineData.open,
        high: klineData.high,
        low: klineData.low,
        close: klineData.close
      }
      
      candlestickSeriesRef.current.update(newCandle)
      
      // 更新成交量
      const newVolumeData = {
        time: candleTime as Time,
        value: klineData.volume,
        color: klineData.close >= klineData.open ? '#26a69a' : '#ef5350'
      }
      volumeSeriesRef.current.update(newVolumeData)
    } else {
      // 更新当前K线
      currentCandleRef.current.high = Math.max(currentCandleRef.current.high, klineData.high)
      currentCandleRef.current.low = Math.min(currentCandleRef.current.low, klineData.low)
      currentCandleRef.current.close = klineData.close
      currentCandleRef.current.volume += klineData.volume
      
      // 更新图表上的当前K线
      const updatedCandle: CandlestickData = {
        time: candleTime as Time,
        open: currentCandleRef.current.open,
        high: currentCandleRef.current.high,
        low: currentCandleRef.current.low,
        close: currentCandleRef.current.close
      }
      
      candlestickSeriesRef.current.update(updatedCandle)
      
      // 更新成交量
      const updatedVolumeData = {
        time: candleTime as Time,
        value: currentCandleRef.current.volume,
        color: currentCandleRef.current.close >= currentCandleRef.current.open ? '#26a69a' : '#ef5350'
      }
      volumeSeriesRef.current.update(updatedVolumeData)
    }
  }, [symbol])

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
    
    // 订阅当前品种
    marketService.subscribeToSymbol(symbol)
    
    return () => {
      console.log('清理WebSocket订阅...')
      unsubTick()
      unsubKline()
      unsubConnect()
      unsubDisconnect()
      unsubError()
      marketService.unsubscribeFromSymbol(symbol)
    }
  }, [symbol, handleRealTimeTick, handleRealTimeKline])

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

  // 手动刷新图表
  const handleRefresh = () => {
    console.log('手动刷新图表')
    setIsLoading(true)
    
    // 重新获取历史数据
    const fetchKlineData = async () => {
      try {
        const response = await marketService.getHistoryKlineData(symbol, timeframe, 200)
        
        if (response.success && response.data?.data) {
          const candles: CandlestickData[] = []
          const volumes: HistogramData[] = []
          
          response.data.data.forEach((item: KlineData) => {
            let time: number
            if (typeof item.time === 'number') {
              time = item.time > 10000000000 ? Math.floor(item.time / 1000) : item.time
            } else {
              time = Math.floor(Date.now() / 1000)
            }
            
            candles.push({
              time: time as Time,
              open: Number(item.open),
              high: Number(item.high),
              low: Number(item.low),
              close: Number(item.close),
            })
            
            volumes.push({
              time: time as Time,
              value: Number(item.volume),
              color: item.close >= item.open ? '#26a69a' : '#ef5350',
            })
          })
          
          historicalDataRef.current = candles
          
          if (candles.length > 0) {
            const lastCandle = candles[candles.length - 1]
            currentCandleRef.current = {
              time: Number(lastCandle.time),
              open: lastCandle.open,
              high: lastCandle.high,
              low: lastCandle.low,
              close: lastCandle.close,
              volume: volumes[volumes.length - 1]?.value || 0
            }
          }
          
          if (candlestickSeriesRef.current && volumeSeriesRef.current) {
            candlestickSeriesRef.current.setData(candles)
            volumeSeriesRef.current.setData(volumes)
            
            if (chartRef.current) {
              chartRef.current.timeScale().fitContent()
            }
          }
        }
      } catch (error) {
        console.error('刷新数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchKlineData()
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
            onClick={handleRefresh}
            style={{
              padding: '8px 12px',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.sm,
              background: theme.colors.backgroundLight,
              color: theme.colors.text,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.colors.backgroundLighter
              e.currentTarget.style.borderColor = theme.colors.borderDark
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.colors.backgroundLight
              e.currentTarget.style.borderColor = theme.colors.border
            }}
          >
            刷新图表
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