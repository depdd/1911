import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Typography, Card, Row, Col, Form, Select, InputNumber, Input, Button, Spin, Table, Tag, DatePicker, Space, App } from 'antd'
import dayjs from 'dayjs'
import styled from 'styled-components'

import { useUser } from '../../contexts/UserContext'
import { theme } from '../../styles/theme'
import { tradingService } from '../../services/tradingService'
import marketService from '../../services/marketService'
import { accountService } from '../../services/accountService'
import { TradeRequest, Position, Order, TickData } from '../../types'

const { Title } = Typography

const Container = styled.div`
  padding: 24px;
`

const StyledCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  margin-bottom: 24px;
`

const FormItem = styled(Form.Item)`
  margin-bottom: 16px;
  
  .ant-form-item-label > label {
    color: ${theme.colors.text};
  }
  
  .ant-select-selector {
    background: rgba(26, 31, 58, 0.8) !important;
    border: 1px solid ${theme.colors.border} !important;
    color: ${theme.colors.text} !important;
  }
  
  .ant-input-number {
    background: rgba(26, 31, 58, 0.8) !important;
    border: 1px solid ${theme.colors.border} !important;
    color: ${theme.colors.text} !important;
  }
  
  .ant-input {
    background: rgba(26, 31, 58, 0.8) !important;
    border: 1px solid ${theme.colors.border} !important;
    color: ${theme.colors.text} !important;
  }
  
  .ant-input-number-handler-wrap {
    background: rgba(26, 31, 58, 1) !important;
  }
  
  .ant-input-number-handler {
    color: ${theme.colors.text} !important;
  }
`

const PriceDisplay = styled.div`
  padding: 16px;
  background: rgba(26, 31, 58, 0.8);
  border-radius: ${theme.borderRadius.md};
  margin-bottom: 24px;
  
  .price-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    
    .label {
      color: ${theme.colors.textSecondary};
    }
    
    .value {
      color: ${theme.colors.text};
      font-weight: 500;
    }
  }
`

const TradingPanel: React.FC = () => {
  const { mt5Accounts } = useUser()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [symbols, setSymbols] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<TickData | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [dayOpenPrice, setDayOpenPrice] = useState<number | null>(null)
  const [pricePrecision, setPricePrecision] = useState<number>(5)
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<[string, string]>(['', ''])
  
  const lastPriceRef = useRef<number | null>(null)
  
  useEffect(() => {
    console.log('TradingPanel - mt5Accounts:', mt5Accounts)
  }, [mt5Accounts])

  const getPricePrecision = (symbol: string): number => {
    if (symbol.includes('XAU') || symbol.includes('XAG') || symbol.includes('GOLD') || symbol.includes('SILVER')) {
      return 2
    }
    if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('CRYPTO')) {
      return 2
    }
    if (symbol.includes('INDEX') || symbol.includes('US30') || symbol.includes('US500') || symbol.includes('NAS100')) {
      return 2
    }
    if (symbol.includes('OIL') || symbol.includes('WTI') || symbol.includes('BRENT')) {
      return 2
    }
    return 5
  }

  useEffect(() => {
    if (mt5Accounts.length === 0) return
    
    const fetchSymbols = async () => {
      try {
        setLoading(true)
        const response = await tradingService.getSymbols()
        console.log('交易品种API响应:', response)
        if (response.success && response.data) {
          const symbolsData = response.data.data || response.data
          setSymbols(symbolsData.all_symbols || [])
        }
      } catch (error) {
        console.error('获取交易品种失败:', error)
        message.error('获取交易品种失败')
      } finally {
        setLoading(false)
      }
    }

    fetchSymbols()
  }, [mt5Accounts.length, message])

  const fetchPositions = async () => {
    if (mt5Accounts.length === 0) return
    try {
      const response = await accountService.getPositions()
      if (response.success && response.data) {
        setPositions(response.data.positions || [])
      }
    } catch (error) {
      console.error('获取持仓数据失败:', error)
    }
  }

  const fetchOrders = async () => {
    if (mt5Accounts.length === 0) return
    try {
      let days = 30
      if (dateRange[0] && dateRange[1]) {
        const startDate = dayjs(dateRange[0])
        const endDate = dayjs(dateRange[1])
        days = endDate.diff(startDate, 'day') + 1
      }
      
      const response = await accountService.getHistoryOrders(days)
      if (response.success && response.data) {
        let filteredOrders = response.data.orders || []
        
        if (orderStatusFilter !== 'all') {
          filteredOrders = filteredOrders.filter((order: any) => order.status === orderStatusFilter)
        }
        
        if (dateRange[0] && dateRange[1]) {
          const startDate = dayjs(dateRange[0])
          const endDate = dayjs(dateRange[1]).endOf('day')
          filteredOrders = filteredOrders.filter((order: any) => {
            const orderDate = dayjs(order.openTime || order.open_time)
            return orderDate.isAfter(startDate) && orderDate.isBefore(endDate)
          })
        }
        
        setOrders(filteredOrders)
      }
    } catch (error) {
      console.error('获取订单数据失败:', error)
    }
  }

  useEffect(() => {
    if (mt5Accounts.length === 0) return
    fetchPositions()
    fetchOrders()
  }, [mt5Accounts.length])
  
  useEffect(() => {
    if (mt5Accounts.length === 0) return
    fetchOrders()
  }, [orderStatusFilter, dateRange, mt5Accounts.length])

  const handleRealTimeTick = useCallback((tickData: TickData) => {
    if (tickData.symbol === form.getFieldValue('symbol')) {
      lastPriceRef.current = tickData.bid
      setCurrentPrice(tickData)
      
      const currentFormPrice = form.getFieldValue('price')
      if (!currentFormPrice) {
        form.setFieldsValue({ price: tickData.bid })
      }
    }
  }, [form])

  useEffect(() => {
    const unsubTick = marketService.onTick(handleRealTimeTick)
    
    return () => {
      unsubTick()
    }
  }, [handleRealTimeTick])

  const fetchDayOpenPrice = async (symbol: string) => {
    try {
      const response = await marketService.getHistoryKlineData(symbol, 'D1', 2)
      if (response.success && response.data && response.data.data.length >= 1) {
        const latestDay = response.data.data[0]
        setDayOpenPrice(latestDay.open)
        console.log(`获取${symbol}当日开盘价: ${latestDay.open}`)
      }
    } catch (error) {
      console.error('获取当日开盘价失败:', error)
    }
  }

  // 处理交易品种变化
  const handleSymbolChange = useCallback((symbol: string) => {
    if (symbol) {
      marketService.subscribeToSymbol(symbol)
      fetchDayOpenPrice(symbol) // 获取当日开盘价
      
      // 根据品种设置价格精度
      const precision = getPricePrecision(symbol)
      setPricePrecision(precision)
      
      // 重置价格输入框，等待实时价格更新后再设置默认值
      form.setFieldsValue({ price: undefined })
    }
  }, [form])

  // 处理下单
  const handleSubmit = async (values: TradeRequest) => {
    try {
      setSubmitting(true)
      
      console.log('表单提交值:', values)
      console.log('交易类型:', values.type)
      console.log('当前价格:', currentPrice)
      
      // 如果没有指定价格，使用当前实时价格
      let orderPrice = values.price
      if (!orderPrice && currentPrice) {
        // 买入使用 ask 价格，卖出使用 bid 价格
        orderPrice = values.type === 'buy' ? currentPrice.ask : currentPrice.bid
        console.log(`自动设置价格: type=${values.type}, 使用价格=${orderPrice}`)
      }
      
      // 确保交易类型是小写字符串
      const orderType = values.type?.toLowerCase().trim()
      
      const orderData: TradeRequest = {
        ...values,
        type: orderType as 'buy' | 'sell',
        price: orderPrice,
        // 确保所有字段都有值，避免 None
        sl: values.sl || undefined,
        tp: values.tp || undefined,
        comment: values.comment || undefined,
      }
      
      console.log('最终下单数据:', orderData)
      
      const response = await tradingService.placeOrder(orderData)
      
      if (response.success) {
        message.success('下单成功')
        form.resetFields()
        await fetchPositions() // 重新获取持仓数据
        await fetchOrders() // 重新获取订单数据
      } else {
        message.error(response.error || '下单失败')
      }
    } catch (error) {
      console.error('下单失败:', error)
      message.error('下单失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 处理平仓
  const handleClosePosition = async (ticket: string) => {
    try {
      setSubmitting(true)
      const response = await accountService.closePosition(ticket)
      
      if (response.success) {
        message.success('平仓成功')
        await fetchPositions() // 重新获取持仓数据
      } else {
        message.error(response.error || '平仓失败')
      }
    } catch (error) {
      console.error('平仓失败:', error)
      message.error('平仓失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 持仓表格列
  const positionColumns = [
    {
      title: '交易品种',
      dataIndex: 'symbol',
      key: 'symbol',
    },
    {
      title: '方向',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'buy' ? 'green' : 'red'}>
          {type === 'buy' ? '买入' : '卖出'}
        </Tag>
      ),
    },
    {
      title: '手数',
      dataIndex: 'volume',
      key: 'volume',
    },
    {
      title: '开仓价',
      dataIndex: 'openPrice',
      key: 'openPrice',
    },
    {
      title: '当前价',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number) => (
        <span style={{ color: profit >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Position) => (
        <Button 
          type="primary" 
          danger 
          size="small"
          onClick={() => handleClosePosition(record.ticket)}
          loading={submitting}
        >
          平仓
        </Button>
      ),
    },
  ]

  // 订单历史表格列
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'ticket',
      key: 'ticket',
    },
    {
      title: '交易品种',
      dataIndex: 'symbol',
      key: 'symbol',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '手数',
      dataIndex: 'volume',
      key: 'volume',
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={
          status === 'filled' ? 'green' : 
          status === 'pending' ? 'blue' : 'gray'
        }>
          {status === 'filled' ? '已成交' : 
           status === 'pending' ? '待成交' : '已取消'}
        </Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'openTime',
      key: 'openTime',
    },
  ]

  if (mt5Accounts.length === 0) {
    return (
      <Container>
        <StyledCard>
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 40px',
            color: theme.colors.textSecondary 
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔗</div>
            <Title level={3} style={{ color: theme.colors.text, marginBottom: '16px' }}>
              连接您的MT5账户
            </Title>
            <p style={{ color: theme.colors.textSecondary, fontSize: '16px', marginBottom: '24px' }}>
              要使用交易功能，请先连接您的MetaTrader 5账户。
            </p>
            <Button 
              type="primary" 
              size="large"
              onClick={() => window.location.href = '/user-center'}
              style={{ background: theme.colors.primary, borderColor: theme.colors.primary }}
            >
              前往添加MT5账户
            </Button>
          </div>
        </StyledCard>
      </Container>
    )
  }

  return (
    <Container>
      <Title level={2} style={{ color: theme.colors.text, marginBottom: 24 }}>
        交易面板
      </Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <StyledCard title="新订单">
            {loading ? (
              <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
              </div>
            ) : (
              <Form
                form={form}
                onFinish={handleSubmit}
                layout="vertical"
              >
                <PriceDisplay>
                  <div className="price-item">
                    <span className="label">当前价格:</span>
                    <span className="value">
                      {currentPrice ? (
                        <>
                          {currentPrice.bid.toFixed(pricePrecision)} / {currentPrice.ask.toFixed(pricePrecision)}
                        </>
                      ) : (
                        '-- / --'
                      )}
                    </span>
                  </div>
                  <div className="price-item">
                    <span className="label">涨跌幅:</span>
                    <span className="value" style={{ 
                      color: currentPrice && dayOpenPrice ? 
                        (currentPrice.bid > dayOpenPrice ? '#52c41a' : 
                         currentPrice.bid < dayOpenPrice ? '#ff4d4f' : 
                         theme.colors.text) : 
                        theme.colors.text
                    }}>
                      {currentPrice && dayOpenPrice ? (
                        <>
                          {currentPrice.bid > dayOpenPrice ? '+' : ''}
                          {( (currentPrice.bid - dayOpenPrice) / dayOpenPrice * 100 ).toFixed(2)}%
                        </>
                      ) : (
                        '--'
                      )}
                    </span>
                  </div>
                  <div className="price-item">
                    <span className="label">成交量:</span>
                    <span className="value">
                      {currentPrice ? currentPrice.volumeReal : '--'}
                    </span>
                  </div>
                </PriceDisplay>
                
                <FormItem
                  name="symbol"
                  label="交易品种"
                  rules={[{ required: true, message: '请选择交易品种' }]}
                >
                  <Select 
                    placeholder="选择交易品种"
                    style={{ width: '100%' }}
                    onChange={handleSymbolChange}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {symbols.map(symbol => (
                      <Select.Option key={symbol} value={symbol}>
                        {symbol}
                      </Select.Option>
                    ))}
                  </Select>
                </FormItem>
                
                <FormItem
                  name="type"
                  label="交易类型"
                  rules={[{ required: true, message: '请选择交易类型' }]}
                >
                  <Select placeholder="选择交易类型" style={{ width: '100%' }}>
                    <Select.Option value="buy">买入</Select.Option>
                    <Select.Option value="sell">卖出</Select.Option>
                  </Select>
                </FormItem>
                
                <FormItem
                  name="price"
                  label="下单价格 (可选，默认使用实时价格)"
                >
                  <InputNumber 
                    min={0} 
                    step={Math.pow(10, -pricePrecision)} 
                    style={{ width: '100%' }}
                    precision={pricePrecision}
                    placeholder={currentPrice ? `当前: ${currentPrice.bid.toFixed(pricePrecision)}` : '自动使用实时价格'}
                  />
                </FormItem>
                
                <FormItem
                  name="volume"
                  label="交易量 (手)"
                  rules={[{ required: true, message: '请输入交易量' }]}
                >
                  <InputNumber 
                    min={0.01} 
                    max={100} 
                    step={0.01} 
                    style={{ width: '100%' }}
                    precision={2}
                  />
                </FormItem>
                
                <Row gutter={16}>
                  <Col xs={12}>
                    <FormItem
                      name="sl"
                      label="止损价格"
                    >
                      <InputNumber 
                        min={0} 
                        step={Math.pow(10, -pricePrecision)} 
                        style={{ width: '100%' }}
                        precision={pricePrecision}
                      />
                    </FormItem>
                  </Col>
                  <Col xs={12}>
                    <FormItem
                      name="tp"
                      label="止盈价格"
                    >
                      <InputNumber 
                        min={0} 
                        step={Math.pow(10, -pricePrecision)} 
                        style={{ width: '100%' }}
                        precision={pricePrecision}
                      />
                    </FormItem>
                  </Col>
                </Row>
                
                <FormItem
                  name="comment"
                  label="备注"
                >
                  <Input 
                    style={{ width: '100%' }}
                    placeholder="订单备注"
                    maxLength={100}
                  />
                </FormItem>
                
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  style={{ width: '100%', marginTop: 8 }}
                  loading={submitting}
                >
                  下单
                </Button>
              </Form>
            )}
          </StyledCard>
        </Col>
        
        <Col xs={24} lg={12}>
          <StyledCard title="持仓管理">
            {positions.length > 0 ? (
              <Table 
                columns={positionColumns} 
                dataSource={positions} 
                rowKey="ticket"
                pagination={false}
                size="small"
                scroll={{ y: 350 }}
              />
            ) : (
              <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Title level={4} style={{ color: theme.colors.textSecondary }}>
                  暂无持仓
                </Title>
              </div>
            )}
          </StyledCard>
        </Col>
      </Row>

      <StyledCard title="订单历史">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ marginBottom: 16 }}>
            <span style={{ color: theme.colors.text }}>订单状态:</span>
            <Select 
              value={orderStatusFilter} 
              onChange={setOrderStatusFilter}
              style={{ width: 120 }}
            >
              <Select.Option value="all">全部</Select.Option>
              <Select.Option value="filled">已成交</Select.Option>
              <Select.Option value="pending">待成交</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
            </Select>
            <span style={{ color: theme.colors.text, marginLeft: 16 }}>时间范围:</span>
            <DatePicker.RangePicker
              value={dateRange[0] && dateRange[1] ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
              onChange={(dates: any) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')])
                } else {
                  setDateRange(['', ''])
                }
              }}
              style={{ width: 240 }}
            />
          </Space>
          
          {orders.length > 0 ? (
            <Table 
              columns={orderColumns} 
              dataSource={orders} 
              rowKey="ticket"
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ y: 350 }}
            />
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Title level={4} style={{ color: theme.colors.textSecondary }}>
                暂无订单历史
              </Title>
            </div>
          )}
        </Space>
      </StyledCard>
    </Container>
  )
}

export default TradingPanel