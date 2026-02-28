import requests

# 测试资金曲线API
response = requests.get('http://localhost:5000/api/dashboard/performance?days=30')
print("API响应状态码:", response.status_code)

if response.status_code == 200:
    data = response.json()
    print("\n总交易次数:", data.get('data', {}).get('total_trades', 0))
    print("总盈亏:", data.get('data', {}).get('total_profit', 0))
    print("胜率:", data.get('data', {}).get('win_rate', 0))
    print("最大回撤:", data.get('data', {}).get('max_drawdown', 0))
    
    # 检查equity_curve数据
    equity_curve = data.get('data', {}).get('equity_curve', [])
    print(f"\n资金曲线数据点数量:", len(equity_curve))
    
    # 打印所有数据点的日期和累计资金
    print("\n所有数据点:")
    for i, item in enumerate(equity_curve):
        date = item.get('date')
        cumulative = item.get('cumulative')
        print(f"{i+1}. 日期: {date}, 累计资金: {cumulative}")
else:
    print("API请求失败:", response.text)
