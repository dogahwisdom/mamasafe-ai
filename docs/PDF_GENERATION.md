# PDF Generation Guide

## User Guide PDF

The User Guide has been converted to PDF format for easy sharing.

### Location

The PDF file is located at:
```
docs/USER_GUIDE.pdf
```

### Regenerating the PDF

If you need to regenerate the PDF after making changes to the markdown file:

```bash
cd /home/txdigitalafrica/Downloads/mamasafe-ai
pandoc docs/USER_GUIDE.md -o docs/USER_GUIDE.pdf \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  --toc \
  --toc-depth=3
```

### Requirements

- Pandoc installed (`sudo apt-get install pandoc` or `brew install pandoc`)
- LaTeX engine (pdflatex or xelatex) for best results

### Alternative Methods

If pandoc is not available, you can:

1. **Use online converters:**
   - Markdown to PDF: https://www.markdowntopdf.com/
   - Upload `docs/USER_GUIDE.md` and download PDF

2. **Use VS Code extension:**
   - Install "Markdown PDF" extension
   - Right-click on `USER_GUIDE.md` → "Markdown PDF: Export (pdf)"

3. **Use Node.js:**
   ```bash
   npm install -g markdown-pdf
   markdown-pdf docs/USER_GUIDE.md -o docs/USER_GUIDE.pdf
   ```

### PDF Features

The generated PDF includes:
- Table of contents with page numbers
- Professional formatting
- All sections and subsections
- Proper page breaks
- Clean typography

---

**Note:** The PDF is ready to share with users who need to learn how to use the app.
