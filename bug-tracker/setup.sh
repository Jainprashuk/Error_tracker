#!/bin/bash

echo "🚀 Setting up Bug Tracker Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🎉 Setup complete! You can now run:"
    echo "   npm run dev     - Start development server"
    echo "   npm run build   - Build for production"
    echo "   npm run lint    - Run ESLint"
    echo ""
    echo "📖 Check SETUP.md for more information."
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
