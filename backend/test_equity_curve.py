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
    
    # 打印前几个数据点
    print("\n前5个数据点:")
    for i, item in enumerate(equity_curve[:5]):
        print(f"{i+1}. 日期: {item.get('date')}, 累计资金: {item.get('cumulative')}, 盈亏: {item.get('profit')}")
    
    # 检查是否有重复日期
    dates = [item.get('date') for item in equity_curve]
    unique_dates = set(dates)
    print(f"\n唯一日期数量:", len(unique_dates))
    print(f"总日期数量:", len(dates))
    
    if len(dates) != len(unique_dates):
        print("\n发现重复日期:")
        seen = set()
        duplicates = []
        for date in dates:
            if date in seen:
                duplicates.append(date)
            else:
                seen.add(date)
        print("重复日期:", duplicates)
else:
    print("API请求失败:", response.text)
