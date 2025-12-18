import React, { useState } from 'react'
import { Card, Form, Select, InputNumber, Button, Space, Input, Row, Col, message } from 'antd'
import { RiseOutlined, FallOutlined, ClearOutlined } from '@ant-design/icons'
import styled from 'styled-components'

import { tradingService } from '../../services/tradingService'
import { theme } from '../../styles/theme'

const QuickTradeCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  
  .ant-card-head {
    background: transparent;
    border-bottom: 1px solid ${theme.colors.border};
    
    .ant-card-head-title {
      color: ${theme.colors.text};
      font-weight: ${theme.typography.fontWeight.semibold};
    }
  }
`

const TradeForm = styled(Form)`
  .ant-form-item-label > label {
    color: ${theme.colors.textSecondary};
    font-weight: ${theme.typography.fontWeight.medium};
  }
  
  .ant-select-selector {
    background: rgba(26, 31, 58, 0.8) !important;
    border: 1px solid ${theme.colors.border} !important;
    
    &:hover, &:focus {
      border-color: ${theme.colors.primary} !important;
      box-shadow: 0 0 0 2px ${theme.colors.shadow} !important;
    }
  }
  
  .ant-input-number {
    background: rgba(26, 31, 58, 0.8) !important;
    border: 1px solid ${theme.colors.border} !important;
    color: ${theme.colors.text} !important;
    
    &:hover, &:focus {
      border-color: ${theme.colors.primary} !important;
      box-shadow: 0 0 0 2px ${theme.colors.shadow} !important;
    }
    
    .ant-input-number-handler-wrap {
      background: ${theme.colors.backgroundLight} !important;
      border-left: 1px solid ${theme.colors.border} !important;
    }
    
    .ant-input-number-handler {
      color: ${theme.colors.textSecondary} !important;
      
      &:hover {
        color: ${theme.colors.primary} !important;
      }
    }
  }
`

const TradeButton = styled(Button)<{ type: 'buy' | 'sell' }>`
  width: 100%;
  height: 48px;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  border-radius: ${theme.borderRadius.md};
  
  ${props => 
    props.type === 'buy'
      ? `
        background: linear-gradient(135deg, ${theme.colors.success} 0%, ${theme.colors.successLight} 100%);
        border-color: ${theme.colors.success};
        
        &:hover {
          background: linear-gradient(135deg, ${theme.colors.successDark} 0%, ${theme.colors.success} 100%);
          border-color: ${theme.colors.successDark};
          transform: translateY(-2px);
          box-shadow: 0 4px 12px ${theme.colors.success}40;
        }
      `
      : `
        background: linear-gradient(135deg, ${theme.colors.error} 0%, ${theme.colors.errorLight} 100%);
        border-color: ${theme.colors.error};
        
        &:hover {
          background: linear-gradient(135deg, ${theme.colors.errorDark} 0%, ${theme.colors.error} 100%);
          border-color: ${theme.colors.errorDark};
          transform: translateY(-2px);
          box-shadow: 0 4px 12px ${theme.colors.error}40;
        }
      `
  }
  
  &:active {
    transform: translateY(0);
  }
`

const symbols = [
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCHF',
  'USDCAD',
  'NZDUSD',
  'EURGBP',
  'EURJPY',
  'GBPJPY',
  'XAUUSD',
  'XAGUSD',
  'BTCUSD',
]

const QuickTradePanel: React.FC = () => {
  const [form] = Form.useForm()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleTrade = async (tradeType: 'buy' | 'sell') => {
    try {
      console.log('准备交易请求:', tradeType)
      const values = await form.validateFields()
      setIsSubmitting(true)

      const tradeRequest = {
        symbol: values.symbol,
        type: tradeType, // 这里保持原始字符串类型，转换逻辑已在tradingService中统一处理
        volume: values.volume,
        price: 0, // 市价单
        sl: values.stopLoss || 0,
        tp: values.takeProfit || 0,
        comment: values.comment || '',
      }
      
      console.log('交易参数:', tradeRequest)

      const response = await tradingService.placeOrder(tradeRequest)

      if (response.success) {
        // 交易成功，可以显示成功消息
        console.log(`${tradeType} order placed successfully:`, response.data)
        message.success('Order placed successfully!')
        form.resetFields()
      } else {
        // 交易失败，显示错误消息
        console.error(`Failed to place ${tradeType} order:`, response.error)
        message.error(response.error || 'Failed to place order')
      }
    } catch (error: any) {
      console.error('Trade error:', error)
      console.error('Error details:', {
        response: error.response,
        data: error.response?.data,
        message: error.message,
        status: error.response?.status
      })
      message.error(error.response?.data?.error || error.message || 'Failed to place order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    form.resetFields()
  }

  return (
    <QuickTradeCard title="快速交易" size="small">
      <TradeForm form={form} layout="vertical" size="middle">
        <Form.Item
          name="symbol"
          label="交易品种"
          rules={[{ required: true, message: '请选择交易品种' }]}
        >
          <Select
            placeholder="选择交易品种"
            options={symbols.map(symbol => ({
              value: symbol,
              label: symbol,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="volume"
          label="交易量 (手)"
          rules={[{ required: true, message: '请输入交易量' }]}
          initialValue={0.1}
        >
          <InputNumber
            min={0.01}
            max={100}
            step={0.01}
            placeholder="交易量"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="stopLoss"
              label="止损 (点)"
            >
              <InputNumber
                min={0}
                step={1}
                placeholder="止损"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="takeProfit"
              label="止盈 (点)"
            >
              <InputNumber
                min={0}
                step={1}
                placeholder="止盈"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="comment"
          label="备注"
        >
          <Input.TextArea
            rows={2}
            placeholder="交易备注 (可选)"
          />
        </Form.Item>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={12}>
            <Col span={12}>
              <TradeButton
                type="buy"
                icon={<RiseOutlined />}
                loading={isSubmitting}
                onClick={() => handleTrade('buy')}
              >
                买入 (BUY)
              </TradeButton>
            </Col>
            <Col span={12}>
              <TradeButton
                type="sell"
                icon={<FallOutlined />}
                loading={isSubmitting}
                onClick={() => handleTrade('sell')}
              >
                卖出 (SELL)
              </TradeButton>
            </Col>
          </Row>

          <Button
            type="text"
            icon={<ClearOutlined />}
            onClick={handleReset}
            style={{ width: '100%', color: theme.colors.textSecondary }}
          >
            重置表单
          </Button>
        </Space>
      </TradeForm>
    </QuickTradeCard>
  )
}

export default QuickTradePanel