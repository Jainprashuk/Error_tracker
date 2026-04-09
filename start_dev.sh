#!/bin/bash

# BugTrace Master Startup Script (V2 - includes Testing Playground)
# This script opens 4 separate Terminal windows for Backend, Frontend, SDK, and Playground.

PROJECT_ROOT=$(pwd)

echo "🚀 Starting BugTrace Development Environment..."

# 1. Build SDK (Required for local linking)
echo "📦 Building SDK..."
cd "$PROJECT_ROOT/sdk" && npm run build
cd "$PROJECT_ROOT"

# 2. Start Collector (Backend)
osascript -e "tell application \"Terminal\"" -e "activate" -e "do script \"cd '$PROJECT_ROOT/collector' && source venv/bin/activate && uvicorn app.main:app --reload --port 8000\"" -e "end tell"

# 3. Start Bug-Tracker (Dashboard Frontend)
osascript -e "tell application \"Terminal\"" -e "do script \"cd '$PROJECT_ROOT/bug-tracker' && npm run dev\"" -e "end tell"

# 4. Start Playground (Testing App)
# 💡 Link the built SDK to the playground
osascript -e "tell application \"Terminal\"" -e "do script \"cd '$PROJECT_ROOT/playground' && npm install ../sdk && npm run dev\"" -e "end tell"

echo "✅ All terminals launched!"
echo "   - Collector:  http://localhost:8000"
echo "   - Dashboard:  Check Terminal for Vite URL"
echo "   - Playground: http://localhost:5173 (Linked to local SDK)"
