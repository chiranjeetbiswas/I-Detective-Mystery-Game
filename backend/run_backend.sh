#!/usr/bin/env bash
# Starts the Identity Hunt backend fully detached from the calling shell.
cd "$(dirname "$0")"
pkill -f "uvicorn app.main:app" 2>/dev/null || true
sleep 1
setsid nohup python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8100 \
  > /tmp/identityhunt-backend.log 2>&1 < /dev/null &
echo "backend starting (pid $!)"
