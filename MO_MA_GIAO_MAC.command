#!/bin/bash
set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
echo "🐉 Đang khởi động MA GIÁO ONLINE – THIÊN HẠ ĐỆ NHẤT TÀ PHÁI..."
node "$SCRIPT_DIR/tools/ma-giao-launcher/launcher.cjs" --game "$SCRIPT_DIR"
