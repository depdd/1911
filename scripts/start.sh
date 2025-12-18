#!/bin/bash

# 外汇量化交易平台启动脚本

echo "========================================="
echo "外汇量化交易平台启动脚本"
echo "========================================="

# 检查Python环境
echo "检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "错误: Python3 未安装"
    exit 1
fi

if ! command -v pip3 &> /dev/null; then
    echo "错误: pip3 未安装"
    exit 1
fi

# 检查Node.js环境
echo "检查Node.js环境..."
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: npm 未安装"
    exit 1
fi

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：启动后端
check_backend() {
    echo -e "${BLUE}检查后端环境...${NC}"
    
    cd backend
    
    # 检查requirements.txt是否存在
    if [ ! -f "requirements.txt" ]; then
        echo -e "${RED}错误: requirements.txt 不存在${NC}"
        cd ..
        return 1
    fi
    
    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}创建Python虚拟环境...${NC}"
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 安装依赖
    echo -e "${YELLOW}安装Python依赖...${NC}"
    pip install -r requirements.txt
    
    # 检查MT5库是否安装
    if ! python3 -c "import MetaTrader5; print('MT5库已安装')" 2>/dev/null; then
        echo -e "${RED}警告: MT5 Python库未安装，策略功能将不可用${NC}"
        echo "请确保已安装MetaTrader5终端，然后运行:"
        echo "pip install MetaTrader5"
    fi
    
    cd ..
    echo -e "${GREEN}后端环境检查完成${NC}"
    return 0
}

# 函数：启动前端
check_frontend() {
    echo -e "${BLUE}检查前端环境...${NC}"
    
    cd frontend
    
    # 检查package.json是否存在
    if [ ! -f "package.json" ]; then
        echo -e "${RED}错误: package.json 不存在${NC}"
        cd ..
        return 1
    fi
    
    # 安装依赖
    echo -e "${YELLOW}安装Node.js依赖...${NC}"
    npm install
    
    cd ..
    echo -e "${GREEN}前端环境检查完成${NC}"
    return 0
}

# 函数：启动后端服务
start_backend() {
    echo -e "${BLUE}启动后端服务...${NC}"
    cd backend
    source venv/bin/activate
    
    # 检查端口是否被占用
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}警告: 端口5000已被占用，尝试使用端口5001${NC}"
        export FLASK_PORT=5001
    fi
    
    # 启动Flask应用
    python3 app.py &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    
    cd ..
    echo -e "${GREEN}后端服务已启动 (PID: $BACKEND_PID)${NC}"
}

# 函数：启动前端服务
start_frontend() {
    echo -e "${BLUE}启动前端服务...${NC}"
    cd frontend
    
    # 检查端口是否被占用
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}警告: 端口3000已被占用，尝试使用端口3001${NC}"
        npm run dev -- --port 3001 &
    else
        npm run dev &
    fi
    
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    
    cd ..
    echo -e "${GREEN}前端服务已启动 (PID: $FRONTEND_PID)${NC}"
}

# 函数：显示使用说明
show_usage() {
    echo "使用方法:"
    echo "  ./start.sh [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -b, --backend  仅启动后端"
    echo "  -f, --frontend 仅启动前端"
    echo "  -c, --check    仅检查环境"
    echo "  -s, --stop     停止所有服务"
    echo ""
    echo "示例:"
    echo "  ./start.sh           # 启动前后端服务"
    echo "  ./start.sh --backend # 仅启动后端"
    echo "  ./start.sh --stop    # 停止所有服务"
}

# 函数：停止服务
stop_services() {
    echo -e "${BLUE}停止所有服务...${NC}"
    
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            echo -e "${GREEN}已停止后端服务 (PID: $BACKEND_PID)${NC}"
        fi
        rm -f backend.pid
    fi
    
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill $FRONTEND_PID
            echo -e "${GREEN}已停止前端服务 (PID: $FRONTEND_PID)${NC}"
        fi
        rm -f frontend.pid
    fi
    
    # 强制停止相关进程
    pkill -f "python3 app.py" 2>/dev/null
    pkill -f "npm run dev" 2>/dev/null
    
    echo -e "${GREEN}所有服务已停止${NC}"
}

# 主程序
main() {
    case "${1:-}" in
        -h|--help)
            show_usage
            exit 0
            ;;
        -b|--backend)
            check_backend || exit 1
            start_backend
            ;;
        -f|--frontend)
            check_frontend || exit 1
            start_frontend
            ;;
        -c|--check)
            check_backend || exit 1
            check_frontend || exit 1
            echo -e "${GREEN}环境检查完成，所有依赖项正常${NC}"
            ;;
        -s|--stop)
            stop_services
            ;;
        "")
            # 默认启动前后端
            check_backend || exit 1
            check_frontend || exit 1
            
            start_backend
            sleep 2
            start_frontend
            
            echo ""
            echo "========================================="
            echo -e "${GREEN}外汇量化交易平台已启动${NC}"
            echo "========================================="
            echo "前端地址: http://localhost:3000"
            echo "后端API: http://localhost:5000/api"
            echo "WebSocket: ws://localhost:5001"
            echo ""
            echo "按 Ctrl+C 停止服务"
            echo "========================================="
            
            # 等待用户中断
            trap stop_services INT
            wait
            ;;
        *)
            echo -e "${RED}错误: 未知选项 $1${NC}"
            show_usage
            exit 1
            ;;
    esac
}

# 检查脚本执行权限
if [ ! -x "$0" ]; then
    echo -e "${YELLOW}添加执行权限...${NC}"
    chmod +x "$0"
fi

# 运行主程序
main "$@"