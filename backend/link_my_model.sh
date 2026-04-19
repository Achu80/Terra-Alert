#!/bin/bash
# Link your AI module to backend

echo "======================================================================"
echo "LINKING AI MODULE"
echo "======================================================================"
echo ""

# Set paths
SOURCE_DIR="../ai-module"
TARGET_DIR="ml/models"

echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"
echo ""

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Copy all model files
echo "Copying model files..."
cp "$SOURCE_DIR"/*.pkl "$TARGET_DIR/" 2>/dev/null
cp "$SOURCE_DIR"/*.pickle "$TARGET_DIR/" 2>/dev/null
cp "$SOURCE_DIR"/*.joblib "$TARGET_DIR/" 2>/dev/null
cp "$SOURCE_DIR"/*.h5 "$TARGET_DIR/" 2>/dev/null
cp "$SOURCE_DIR"/*.pt "$TARGET_DIR/" 2>/dev/null
cp "$SOURCE_DIR"/*.pth "$TARGET_DIR/" 2>/dev/null

# Copy feature files
cp "$SOURCE_DIR"/*feature*.txt "$TARGET_DIR/" 2>/dev/null
cp "$SOURCE_DIR"/*feature*.json "$TARGET_DIR/" 2>/dev/null
cp "$SOURCE_DIR"/*feature*.csv "$TARGET_DIR/" 2>/dev/null

echo ""
echo "======================================================================"
echo "DONE! Files copied to: $TARGET_DIR"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "1. Run: python ml/analyze_model.py ml/models/your_model.pkl"
echo "2. Check required features"
echo "3. Update GEE service"
echo ""
