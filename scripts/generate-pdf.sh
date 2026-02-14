#!/bin/bash

# Generate PDF from User Guide Markdown
# Usage: ./scripts/generate-pdf.sh

echo "Generating PDF from User Guide..."

cd "$(dirname "$0")/.."

if [ ! -f "docs/USER_GUIDE.md" ]; then
    echo "Error: docs/USER_GUIDE.md not found"
    exit 1
fi

# Try different pandoc engines
if command -v pandoc &> /dev/null; then
    echo "Using pandoc to generate PDF..."
    
    # Try pdflatex first
    if pandoc docs/USER_GUIDE.md -o docs/USER_GUIDE.pdf \
        --pdf-engine=pdflatex \
        -V geometry:margin=1in \
        -V fontsize=11pt \
        -V documentclass=article \
        --toc \
        --toc-depth=3 2>/dev/null; then
        echo "✅ PDF generated successfully using pdflatex"
        echo "📄 Output: docs/USER_GUIDE.pdf"
        exit 0
    fi
    
    # Try xelatex
    if pandoc docs/USER_GUIDE.md -o docs/USER_GUIDE.pdf \
        --pdf-engine=xelatex \
        -V geometry:margin=1in \
        -V fontsize=11pt \
        -V documentclass=article \
        --toc \
        --toc-depth=3 2>/dev/null; then
        echo "✅ PDF generated successfully using xelatex"
        echo "📄 Output: docs/USER_GUIDE.pdf"
        exit 0
    fi
    
    # Fallback to default
    if pandoc docs/USER_GUIDE.md -o docs/USER_GUIDE.pdf \
        -V geometry:margin=1in \
        -V fontsize=11pt \
        --toc \
        --toc-depth=3 2>/dev/null; then
        echo "✅ PDF generated successfully"
        echo "📄 Output: docs/USER_GUIDE.pdf"
        exit 0
    fi
    
    echo "❌ Failed to generate PDF with pandoc"
    exit 1
else
    echo "❌ Error: pandoc not found"
    echo "Install pandoc: sudo apt-get install pandoc"
    exit 1
fi
