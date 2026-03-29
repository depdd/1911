import React, { useEffect, useRef, useState, useCallback } from 'react'
import styled from 'styled-components'
import { createChart, CandlestickData, HistogramData, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
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

const PriceDisplay = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  z-index: 5;
  font-family: 'Courier New', monospace;
`

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
  const [currentPrice, setCurrentPrice] = useState<{ bid: number; ask: number; spread: number } | null>(null)
  const [priceChange, setPriceChange] = useState<{ direction: 'up' | 'down' | null; amount: number }>({ direction: null, amount: 0 })
  const [tickCount, setTickCount] = useState<number>(0)
  const [chartReady, setChartReady] = useState<boolean>(false)
  
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
  
  const currentCandleRef = useRef<{
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  } | null>(null)

  const historicalDataRef = useRef<CandlestickData[]>([])
  const historicalVolumeDataRef = useRef<HistogramData[]>([])
  const lastPriceRef = useRef<number | null>(null)
  const tickCountRef = useRef<number>(0)

  const getCandleStartTime = useCallback((timestamp: number, tf: string): number => {
    const date = new Date(timestamp * 1000)
    const minutes = date.getUTCMinutes()
    const hours = date.getUTCHours()
    
    let candleMinutes = 1
    switch (tf) {
      case 'M1': candleMinutes = 1; break
      case 'M5': candleMinutes = 5; break
      case 'M15': candleMinutes = 15; break
      case 'M30': candleMinutes = 30; break
      case 'H1': candleMinutes = 60; break
      case 'H4': candleMinutes = 240; break
      case 'D1': candleMinutes = 1440; break
      case 'W1': candleMinutes = 10080; break
      case 'MN1': candleMinutes = 43200; break
      default: candleMinutes = 1
    }
    
    const totalMinutes = hours * 60 + minutes
    const candleStartMinutes = Math.floor(totalMinutes / candleMinutes) * candleMinutes
    const candleStartHours = Math.floor(candleStartMinutes / 60)
    const candleStartMins = candleStartMinutes % 60
    
    const candleDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), candleStartHours, candleStartMins, 0, 0))
    
    if (tf === 'W1') {
      const dayOfWeek = candleDate.getUTCDay()
      const diff = candleDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      candleDate.setUTCDate(diff)
      candleDate.setUTCHours(0, 0, 0, 0)
    }
    
    if (tf === 'MN1') {
      candleDate.setUTCDate(1)
      candleDate.setUTCHours(0, 0, 0, 0)
    }
    
    return Math.floor(candleDate.getTime() / 1000)
  }, [])

  const handleRealTimeTick = useCallback((tickData: any) => {
    console.log('收到tick数据:', tickData)
    
    if (tickData.symbol !== symbol) {
      console.log(`品种不匹配: tickData.symbol=${tickData.symbol}, 当前symbol=${symbol}`)
      return
    }
    if (!candlestickSeriesRef.current) {
      console.log('candlestickSeriesRef.current 为空')
      return
    }
    
    const bid = Number(tickData.bid) || 0
    const ask = Number(tickData.ask) || 0
    const price = (bid + ask) / 2
    const spread = ask - bid
    
    console.log(`价格计算: bid=${bid}, ask=${ask}, price=${price}, spread=${spread}`)
    
    if (price <= 0) {
      console.log('价格无效，跳过')
      return
    }
    
    tickCountRef.current++
    setTickCount(prev => prev + 1)
    
    if (lastPriceRef.current !== null) {
      const diff = price - lastPriceRef.current
      if (Math.abs(diff) > 0.0000001) {
        setPriceChange({
          direction: diff > 0 ? 'up' : 'down',
          amount: Math.abs(diff)
        })
        setTimeout(() => setPriceChange({ direction: null, amount: 0 }), 300)
      }
    }
    lastPriceRef.current = price
    setCurrentPrice({ bid, ask, spread })
    
    if (historicalDataRef.current.length === 0) {
      console.log('历史数据为空，无法更新K线')
      return
    }
    
    const tickTime = tickData.time || Math.floor(Date.now() / 1000)
    const candleStartTime = getCandleStartTime(tickTime, timeframe)
    const lastCandle = historicalDataRef.current[historicalDataRef.current.length - 1]
    const lastCandleTime = normalizeTime(lastCandle.time)
    
    console.log(`时间计算: tickTime=${tickTime}, candleStartTime=${candleStartTime}, lastCandleTime=${lastCandleTime}`)
    console.log(`K线比较: candleStartTime === lastCandleTime ? ${candleStartTime === lastCandleTime}`)
    
    if (candleStartTime === lastCandleTime) {
      console.log('更新当前K线...')
      const updatedCandle: CandlestickData = {
        time: lastCandle.time,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, price),
        low: Math.min(lastCandle.low, price),
        close: price
      }
      
      console.log('更新后的K线:', updatedCandle)
      historicalDataRef.current[historicalDataRef.current.length - 1] = updatedCandle
      currentCandleRef.current = {
        time: candleStartTime,
        open: updatedCandle.open,
        high: updatedCandle.high,
        low: updatedCandle.low,
        close: updatedCandle.close,
        volume: (currentCandleRef.current?.volume || 0) + 1
      }
      
      try {
        candlestickSeriesRef.current.update(updatedCandle)
      } catch (e) {
        console.error('更新K线失败:', e)
      }
      
      if (volumeSeriesRef.current) {
        const lastVolume = historicalVolumeDataRef.current[historicalVolumeDataRef.current.length - 1]
        if (lastVolume) {
          try {
            volumeSeriesRef.current.update({
              time: lastVolume.time,
              value: lastVolume.value + 1,
              color: updatedCandle.close >= updatedCandle.open ? '#26a69a' : '#ef5350'
            })
          } catch (e) {
            console.error('更新成交量失败:', e)
          }
        }
      }
    } else if (candleStartTime > lastCandleTime) {
      const newCandle: CandlestickData = {
        time: candleStartTime as UTCTimestamp,
        open: price,
        high: price,
        low: price,
        close: price
      }
      
      historicalDataRef.current.push(newCandle)
      currentCandleRef.current = {
        time: candleStartTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 1
      }
      
      try {
        candlestickSeriesRef.current.update(newCandle)
      } catch (e) {
        console.error('创建新K线失败:', e)
      }
      
      if (volumeSeriesRef.current) {
        const newVolume: HistogramData = {
          time: candleStartTime as UTCTimestamp,
          value: 1,
          color: '#26a69a'
        }
        
        historicalVolumeDataRef.current.push(newVolume)
        
        try {
          volumeSeriesRef.current.update(newVolume)
        } catch (e) {
          console.error('创建新成交量失败:', e)
        }
      }
      
      if (chartRef.current) {
        chartRef.current.timeScale().scrollToRealTime()
      }
    }
  }, [symbol, timeframe, getCandleStartTime])

  useEffect(() => {
    console.log('初始化图表...')
    
    if (!chartContainerRef.current) return
    
    try {
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (error) {
          console.warn('清理图表时出现错误:', error)
        }
        chartRef.current = null
      }
      
      const containerWidth = chartContainerRef.current.clientWidth
      const containerHeight = chartContainerRef.current.clientHeight
      
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
          secondsVisible: false,
          borderColor: '#2B2B43'
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
          precision: 5,
          minMove: 0.00001,
        },
      })
      candlestickSeriesRef.current = candlestickSeries
      
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      })
      volumeSeriesRef.current = volumeSeries
      
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      })
      
      console.log('图表初始化完成')
      setChartReady(true)
      
      return () => {
        console.log('清理图表')
        if (chart) {
          chart.remove()
        }
      }
    } catch (error) {
      console.error('图表初始化错误:', error)
    }
  }, [])

  useEffect(() => {
    if (!candlestickSeriesRef.current) return
    
    let pricePrecision = 5
    let minMove = 0.00001
    
    if (symbol === 'BTCUSD' || symbol === 'XAUUSD') {
      pricePrecision = 2
      minMove = 0.01
    }
    
    candlestickSeriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision: pricePrecision,
        minMove: minMove,
      },
    })
  }, [symbol])

  useEffect(() => {
    if (!chartReady || !candlestickSeriesRef.current) return
    
    const fetchKlineData = async () => {
      console.log('获取历史K线数据...')
      
      setIsLoading(true)
      currentCandleRef.current = null
      lastPriceRef.current = null
      tickCountRef.current = 0
      
      try {
        const response = await marketService.getHistoryKlineData(symbol, timeframe, 200)
        
        if (response.success && response.data?.data) {
          console.log(`获取到 ${response.data.data.length} 条历史K线数据`)
          
          historicalDataRef.current = []
          historicalVolumeDataRef.current = []
          
          const candles: CandlestickData[] = []
          const volumes: HistogramData[] = []
          
          response.data.data.forEach((item: any) => {
            let time: number
            
            if (typeof item.time === 'string') {
              const date = new Date(item.time)
              time = Math.floor(date.getTime() / 1000)
            } else if (typeof item.time === 'number') {
              time = item.time < 10000000000 ? item.time : Math.floor(item.time / 1000)
            } else {
              console.warn('Invalid time format:', item.time)
              return
            }
            
            const openPrice = Number(item.open)
            const highPrice = Number(item.high)
            const lowPrice = Number(item.low)
            const closePrice = Number(item.close)
            const vol = Number(item.tick_volume) || Number(item.volume) || Number(item.real_volume) || 0
            
            if (isNaN(openPrice) || isNaN(highPrice) || isNaN(lowPrice) || isNaN(closePrice)) {
              console.warn('Invalid price data:', item)
              return
            }
            
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
          
          candles.sort((a, b) => normalizeTime(a.time) - normalizeTime(b.time))
          volumes.sort((a, b) => normalizeTime(a.time) - normalizeTime(b.time))
          
          historicalDataRef.current = candles
          historicalVolumeDataRef.current = volumes
          
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
            lastPriceRef.current = lastCandle.close
            setCurrentPrice({
              bid: lastCandle.close,
              ask: lastCandle.close,
              spread: 0
            })
          }
          
          if (candlestickSeriesRef.current && volumeSeriesRef.current) {
            candlestickSeriesRef.current.setData(candles)
            volumeSeriesRef.current.setData(volumes)
            
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
  }, [symbol, timeframe, chartReady])

  useEffect(() => {
    marketService.subscribeToSymbol(symbol, timeframe)
    
    const unsubscribeTick = marketService.onTick(handleRealTimeTick)
    
    return () => {
      marketService.unsubscribeFromSymbol(symbol, timeframe)
      unsubscribeTick()
    }
  }, [symbol, timeframe, handleRealTimeTick])

  useEffect(() => {
    console.log('设置WebSocket连接...')
    
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
    
    return () => {
      console.log('清理WebSocket订阅...')
      unsubConnect()
      unsubDisconnect()
      unsubError()
    }
  }, [])

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

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSymbol = e.target.value
    console.log('切换品种:', newSymbol)
    setSymbol(newSymbol)
  }

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
        
        {currentPrice && (
          <PriceDisplay>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: priceChange.direction === 'up' ? '#26a69a' : 
                     priceChange.direction === 'down' ? '#ef5350' : theme.colors.text,
              transition: 'color 0.2s ease'
            }}>
              {currentPrice.bid.toFixed(symbol === 'XAUUSD' || symbol === 'BTCUSD' ? 2 : 5)}
            </div>
            <div style={{ fontSize: '11px', color: theme.colors.textSecondary, marginTop: '4px' }}>
              Spread: {currentPrice.spread.toFixed(symbol === 'XAUUSD' || symbol === 'BTCUSD' ? 2 : 5)}
            </div>
            <div style={{ fontSize: '10px', color: theme.colors.textSecondary, marginTop: '2px' }}>
              Ticks: {tickCount}
            </div>
          </PriceDisplay>
        )}
      </ChartContainer>
    </div>
  )
}

export default KlineChart
