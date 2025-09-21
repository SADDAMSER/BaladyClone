#!/bin/bash
# منصة بناء اليمن - Geoprocessing Worker Startup Script
# =========================================================

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== منصة بناء اليمن - Geoprocessing Worker ==="
echo "Starting at: $(date)"
echo "Worker Directory: $SCRIPT_DIR"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1)
echo "✅ Python found: $PYTHON_VERSION"

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Validate configuration
echo "🔍 Validating worker configuration..."
python3 config.py

if [ $? -ne 0 ]; then
    echo "❌ Configuration validation failed"
    exit 1
fi

echo "✅ Configuration validated successfully"

# Check database connectivity
echo "🗄️  Testing database connection..."
python3 -c "
import psycopg2
from config import CONFIG
try:
    conn = psycopg2.connect(**CONFIG.DB_CONFIG)
    conn.close()
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ Database connection test failed"
    exit 1
fi

# Check API connectivity
echo "🌐 Testing API connectivity..."
python3 -c "
import httpx
from config import CONFIG
try:
    response = httpx.get(f'{CONFIG.API_BASE_URL}/health', timeout=10)
    if response.status_code == 200:
        print('✅ API connection successful')
    else:
        print(f'⚠️  API returned status {response.status_code}')
except Exception as e:
    print(f'❌ API connection failed: {e}')
    print('⚠️  Worker will start but may have connectivity issues')
"

# Set environment variables with defaults
export WORKER_NAME="${WORKER_NAME:-geoprocessing-worker-$(hostname)}"
export LOG_LEVEL="${LOG_LEVEL:-INFO}"
export POLL_INTERVAL="${POLL_INTERVAL:-5}"
export HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-30}"

echo "🚀 Starting worker with configuration:"
echo "   Worker Name: $WORKER_NAME"
echo "   Log Level: $LOG_LEVEL"
echo "   Poll Interval: ${POLL_INTERVAL}s"
echo "   Heartbeat Interval: ${HEARTBEAT_INTERVAL}s"
echo "   API Base URL: ${API_BASE_URL:-http://localhost:5000}"

# Create log directory
mkdir -p logs

# Start the worker
echo "🔥 Starting Python Worker..."
echo "Press Ctrl+C to stop the worker"
echo "========================================"

# Run with proper signal handling
exec python3 worker.py 2>&1 | tee -a "logs/worker-$(date +%Y%m%d).log"