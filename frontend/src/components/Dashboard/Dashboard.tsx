import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Row, Col, Card, Statistic, Typography, Space, Button, Table, Tag } from 'antd'
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  PieChartOutlined,
  BarChartOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import styled from 'styled-components'

import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { Position, Account, Trade } from '../../types'
import { accountService } from '../../services/accountService'
import EquityChart from './EquityChart'
import QuickTradePanel from './QuickTradePanel'
import { theme } from '../../styles/theme'

const { Title, Text } = Typography

const DashboardContainer = styled.div`
  padding: 0;
  animation: fadeIn 0.5s ease-out;
`

const DashboardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`

const StatCard = styled(Card)`
  background: rgba(26, 31, 58, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  height: 100%;
  
  .ant-card-body {
    padding: 20px;
  }
  
  .ant-statistic-title {
    color: ${theme.colors.textSecondary};
    font-size: ${theme.typography.fontSize.sm};
    margin-bottom: 8px;
  }
  
  .ant-statistic-content {
    color: ${theme.colors.text};
    font-size: ${theme.typography.fontSize.xxl};
    font-weight: ${theme.typography.fontWeight.bold};
  }
  
  .ant-statistic-content-prefix {
    color: ${theme.colors.textSecondary};
  }
`

const PositionsCard = styled(Card)`
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

const Dashboard: React.FC = () => {
  const { account, updateAccount } = useAuth()
  // 暂时不使用WebSocket功能，只保留钩子调用
  useWebSocket();
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  // 移除未使用的加载状态
  
  // 使用ref保存最新的account引用，避免闭包问题
  const accountRef = useRef(account)
  
  // 当account变化时更新ref
  useEffect(() => {
    accountRef.current = account
  }, [account])

  // 使用useCallback包装加载数据函数，避免每次渲染都重新创建
  const loadAccountData = useCallback(async () => {
    const currentAccount = accountRef.current
    if (!currentAccount) return

    try {
      // 分离Promise.all调用，以便单独调试每个API响应
      const positionsResponse = await accountService.getPositions();
      console.log('🚀 positionsResponse 完整结构:', JSON.stringify(positionsResponse, null, 2));
      
      // 检查positions字段路径
      console.log('🚀 positionsResponse.data 存在吗:', positionsResponse.data !== undefined && positionsResponse.data !== null);
      console.log('🚀 positionsResponse.data 类型:', typeof positionsResponse.data);
      console.log('🚀 positionsResponse.data 内容:', positionsResponse.data);
      
      // 检查positions字段
      const positionsField = positionsResponse.data?.positions;
      console.log('🚀 positionsResponse.data?.positions 存在吗:', positionsField !== undefined && positionsField !== null);
      console.log('🚀 positionsResponse.data?.positions 类型:', typeof positionsField);
      console.log('🚀 positionsResponse.data?.positions 是否为数组:', Array.isArray(positionsField));
      console.log('🚀 positionsResponse.data?.positions 内容:', positionsField);
      
      // 如果positions存在且是数组，打印第一个元素的结构以验证类型匹配
      if (Array.isArray(positionsField) && positionsField.length > 0) {
        console.log('🚀 第一个position元素结构:', JSON.stringify(positionsField[0], null, 2));
      }
      
      // 尝试获取positions数据
      const positionsData = positionsField || [];
      console.log('🚀 最终设置的positions数据:', positionsData);
      setPositions(positionsData);
      
      // 获取账户摘要
      const summaryResponse = await accountService.getAccountSummary();
      console.log('🚀 summaryResponse 完整结构:', JSON.stringify(summaryResponse, null, 2));

      if (summaryResponse.success) {
        // 更新全局账户信息
        const updatedAccount: Account = {
          ...currentAccount,
          balance: summaryResponse.data?.balance || 0,
          equity: summaryResponse.data?.equity || 0,
          margin: summaryResponse.data?.margin || 0,
          freeMargin: summaryResponse.data?.freeMargin || 0, // 使用转换后的camelCase字段名
          marginLevel: summaryResponse.data?.marginLevel || 0, // 使用转换后的camelCase字段名
        }
        updateAccount(updatedAccount)
      }
      
      // 获取交易历史数据用于资金曲线
      const tradesResponse = await accountService.getTrades(30); // 获取最近30天的交易
      console.log('🚀 tradesResponse 完整结构:', JSON.stringify(tradesResponse, null, 2));
      
      if (tradesResponse.success && tradesResponse.data?.trades) {
        setTrades(tradesResponse.data.trades);
        console.log('设置交易历史数据，数量:', tradesResponse.data.trades.length);
      }
    } catch (error) {
      console.error('Failed to load account data:', error);
      // 添加更详细的错误信息
      if (error instanceof Error) {
        console.error('错误名称:', error.name);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);
      }
    }
  }, [updateAccount])

  // 暂时禁用自动刷新机制
  // useEffect(() => {
  //   // 只在组件挂载时执行一次初始加载
  //   if (account) {
  //     loadAccountData()
  //   }
  //   
  //   // 每30秒刷新一次数据
  //   const interval = setInterval(() => {
  //     loadAccountData()
  //   }, 30000)
  //   
  //   return () => clearInterval(interval)
  // }, [loadAccountData])

  // 移除消息处理相关代码，只保留手动刷新功能
  const processingTimerRef = useRef<number | null>(null);
  
  // 组件挂载时加载一次数据，使用正确的依赖数组
  useEffect(() => {
    // 当account存在时执行加载数据
    if (account) {
      loadAccountData();
    }
    
    // 组件卸载时清理
    return () => {
      if (processingTimerRef.current) {
        window.clearTimeout(processingTimerRef.current);
      }
    }
  }, [account, loadAccountData]); // 添加account和loadAccountData到依赖数组，确保当它们变化时重新执行

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return theme.colors.success
    if (profit < 0) return theme.colors.error
    return theme.colors.textSecondary
  }

  const columns = [
    {
      title: '品种',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (symbol: string) => (
        <Text strong style={{ color: theme.colors.primary }}>
          {symbol}
        </Text>
      ),
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
      render: (volume: number) => (volume !== undefined && volume !== null ? volume.toFixed(2) : '0.00'),
    },
    {      title: '开仓价',      dataIndex: 'openPrice',      key: 'openPrice',      render: (price: number) => (price !== undefined && price !== null ? price.toFixed(5) : '0.00000'),    },
    {      title: '当前价',      dataIndex: 'currentPrice',      key: 'currentPrice',      render: (price: number) => (price !== undefined && price !== null ? price.toFixed(5) : '0.00000'),    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number) => (
        <Text strong style={{ color: getProfitColor(profit || 0) }}>
          {(profit || 0) >= 0 ? '+' : ''}{formatCurrency(profit || 0, account?.currency)}
        </Text>
      ),
    },
  ]

  // 计算持仓订单的总盈亏
  const totalProfit = positions.reduce((sum, pos) => sum + (pos.profit || 0), 0)
  // 计算持仓订单的总手数
  const totalVolume = positions.reduce((sum, pos) => sum + (pos.volume || 0), 0)

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title level={2} style={{ color: theme.colors.text, margin: 0 }}>
          交易仪表板
        </Title>
        <Space>
          <Button
            icon={<SyncOutlined />}
            onClick={loadAccountData}
          >
            刷新数据
          </Button>
        </Space>
      </DashboardHeader>

      {/* 账户概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard>
            <Statistic
              title="账户余额"
              value={account?.balance || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<DollarOutlined style={{ color: theme.colors.primary }} />}
              suffix={account?.currency}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard>
            <Statistic
              title="净值"
              value={account?.equity || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<RiseOutlined style={{ color: theme.colors.success }} />}
              suffix={account?.currency}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard>
            <Statistic
              title="可用保证金"
              value={account?.freeMargin || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<PieChartOutlined style={{ color: theme.colors.warning }} />}
              suffix={account?.currency}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard>
            <Statistic
              title="保证金比例"
              value={account?.marginLevel || 0}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<BarChartOutlined style={{ color: theme.colors.info }} />}
              suffix="%"
            />
          </StatCard>
        </Col>
      </Row>

      {/* 持仓概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <StatCard>
            <Statistic
              title="持仓订单数量"
              value={positions.length}
              valueStyle={{ color: theme.colors.text }}
              prefix={<RiseOutlined style={{ color: theme.colors.primary }} />}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <StatCard>
            <Statistic
              title="总手数"
              value={totalVolume}
              precision={2}
              valueStyle={{ color: theme.colors.text }}
              prefix={<PieChartOutlined style={{ color: theme.colors.secondary }} />}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <StatCard>
            <Statistic
              title="总盈亏"
              value={totalProfit}
              precision={2}
              valueStyle={{ color: getProfitColor(totalProfit) }}
              prefix={
                totalProfit >= 0 ? (
                  <RiseOutlined style={{ color: theme.colors.success }} />
                ) : (
                  <FallOutlined style={{ color: theme.colors.error }} />
                )
              }
              suffix={account?.currency}
            />
          </StatCard>
        </Col>
      </Row>

      {/* 图表和快速交易 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title="资金曲线"
            style={{
              background: 'rgba(26, 31, 58, 0.6)',
              border: `1px solid ${theme.colors.border}`,
              backdropFilter: 'blur(10px)',
              borderRadius: theme.borderRadius.lg,
            }}
          >
            <EquityChart trades={trades} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <QuickTradePanel />
        </Col>
      </Row>

      {/* 当前持仓 */}
      <PositionsCard title={`当前持仓 (${positions.length})`}>
        <Table
          columns={columns}
          dataSource={positions}
          rowKey="ticket"
          pagination={false}
          scroll={{ x: 'max-content' }}
          className="data-table"
          style={{ background: 'transparent' }}
        />
      </PositionsCard>
    </DashboardContainer>
  )
}

export default Dashboard