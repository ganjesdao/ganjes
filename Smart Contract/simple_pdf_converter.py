#!/usr/bin/env python3
"""
Simple Markdown to HTML converter for Ganjes DAO Design Document
"""

import markdown2
import os

def convert_markdown_to_html(markdown_file, output_html):
    """Convert markdown file to styled HTML"""
    
    # Read markdown content
    with open(markdown_file, 'r', encoding='utf-8') as f:
        markdown_content = f.read()
    
    # Convert markdown to HTML
    html_content = markdown2.markdown(markdown_content, extras=[
        'fenced-code-blocks', 
        'tables', 
        'header-ids',
        'toc'
    ])
    
    # Add comprehensive CSS styling
    css_content = """
    <style>
    @media print {
        @page {
            margin: 0.75in;
            size: letter;
        }
        
        body {
            font-size: 11pt;
            line-height: 1.4;
        }
        
        h1 {
            page-break-before: always;
            margin-top: 0;
        }
        
        h1:first-of-type {
            page-break-before: avoid;
        }
        
        table {
            page-break-inside: avoid;
        }
        
        pre {
            page-break-inside: avoid;
            font-size: 9pt;
        }
        
        .no-print {
            display: none;
        }
    }
    
    body {
        font-family: Georgia, 'Times New Roman', serif;
        line-height: 1.6;
        color: #333;
        max-width: 100%;
        margin: 0 auto;
        background: white;
    }
    
    h1 {
        color: #1a237e;
        border-bottom: 3px solid #3f51b5;
        padding-bottom: 10px;
        margin-top: 2em;
        margin-bottom: 1em;
        font-size: 2.2em;
    }
    
    h1:first-of-type {
        margin-top: 0;
        text-align: center;
        border-bottom: 5px solid #3f51b5;
        padding-bottom: 20px;
    }
    
    h2 {
        color: #283593;
        border-bottom: 2px solid #9c27b0;
        padding-bottom: 8px;
        margin-top: 2em;
        margin-bottom: 1em;
        font-size: 1.6em;
    }
    
    h3 {
        color: #2196f3;
        margin-top: 1.5em;
        margin-bottom: 0.8em;
        font-size: 1.3em;
    }
    
    h4 {
        color: #4caf50;
        margin-top: 1.2em;
        margin-bottom: 0.6em;
        font-size: 1.1em;
    }
    
    p {
        margin-bottom: 1em;
        text-align: justify;
    }
    
    ul, ol {
        margin-bottom: 1em;
        padding-left: 2em;
    }
    
    li {
        margin-bottom: 0.3em;
    }
    
    table {
        border-collapse: collapse;
        width: 100%;
        margin: 1.5em 0;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    
    table, th, td {
        border: 1px solid #ddd;
    }
    
    th {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px;
        text-align: left;
        font-weight: bold;
    }
    
    td {
        padding: 10px;
        vertical-align: top;
    }
    
    tr:nth-child(even) {
        background-color: #f8f9fa;
    }
    
    tr:hover {
        background-color: #e3f2fd;
    }
    
    code {
        background-color: #f5f5f5;
        padding: 3px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.9em;
        color: #d63384;
        border: 1px solid #e9ecef;
    }
    
    pre {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border: 1px solid #dee2e6;
        border-left: 4px solid #0d6efd;
        border-radius: 6px;
        padding: 1.2em;
        overflow-x: auto;
        margin: 1.5em 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    pre code {
        background-color: transparent;
        padding: 0;
        border: none;
        color: #212529;
        font-size: 0.85em;
    }
    
    blockquote {
        border-left: 5px solid #17a2b8;
        margin: 1.5em 0;
        padding: 1em 1.5em;
        background-color: #e7f3ff;
        color: #0c5460;
        font-style: italic;
        border-radius: 0 6px 6px 0;
    }
    
    /* Special styling for ASCII diagrams */
    pre:has-text("┌"), pre:has-text("│"), pre:has-text("└") {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        border-left: 4px solid #2196f3;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
        font-size: 0.8em;
        line-height: 1.2;
    }
    
    /* Table of contents styling */
    #table-of-contents + ul {
        background: linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%);
        border: 2px solid #ff9800;
        border-radius: 8px;
        padding: 1.5em;
        margin: 2em 0;
    }
    
    /* Status indicators */
    .status-complete::before { content: "✅ "; }
    .status-progress::before { content: "🔄 "; }
    .status-planned::before { content: "📋 "; }
    
    /* Architecture diagram boxes */
    .architecture-box {
        border: 2px solid #6c757d;
        border-radius: 8px;
        padding: 1em;
        margin: 1em 0;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        font-family: monospace;
        font-size: 0.9em;
    }
    
    /* Highlight important sections */
    strong {
        color: #dc3545;
        font-weight: 600;
    }
    
    em {
        color: #6610f2;
        font-style: italic;
    }
    
    /* Links */
    a {
        color: #0d6efd;
        text-decoration: none;
        border-bottom: 1px dotted #0d6efd;
    }
    
    a:hover {
        color: #0a58ca;
        border-bottom: 1px solid #0a58ca;
    }
    
    /* Header with logo space */
    .document-header {
        text-align: center;
        margin-bottom: 3em;
        padding: 2em;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .document-title {
        font-size: 2.5em;
        margin-bottom: 0.5em;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .document-subtitle {
        font-size: 1.2em;
        opacity: 0.9;
    }
    
    /* Footer */
    .document-footer {
        margin-top: 3em;
        padding: 2em;
        background-color: #f8f9fa;
        border-radius: 8px;
        text-align: center;
        border-top: 3px solid #6c757d;
    }
    
    /* Print button */
    .no-print {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
    }
    
    .print-button {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 16px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    }
    
    .print-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.3);
    }
    
    /* Responsive design */
    @media screen and (max-width: 768px) {
        body {
            padding: 1em;
        }
        
        .document-title {
            font-size: 2em;
        }
        
        table {
            font-size: 0.9em;
        }
        
        pre {
            font-size: 0.8em;
        }
    }
    </style>
    """
    
    # JavaScript for print functionality
    javascript = """
    <script>
    function printDocument() {
        window.print();
    }
    
    // Enhance code blocks that contain diagrams
    document.addEventListener('DOMContentLoaded', function() {
        const codeBlocks = document.querySelectorAll('pre');
        codeBlocks.forEach(function(block) {
            const content = block.textContent;
            if (content.includes('┌') || content.includes('│') || content.includes('└')) {
                block.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
                block.style.borderLeft = '4px solid #2196f3';
            }
        });
        
        // Add status indicators
        const listItems = document.querySelectorAll('li');
        listItems.forEach(function(item) {
            const text = item.textContent.toLowerCase();
            if (text.includes('✅') || text.includes('implemented') || text.includes('completed')) {
                item.classList.add('status-complete');
            } else if (text.includes('🔄') || text.includes('in progress') || text.includes('partial')) {
                item.classList.add('status-progress');
            } else if (text.includes('📋') || text.includes('planned') || text.includes('future')) {
                item.classList.add('status-planned');
            }
        });
    });
    </script>
    """
    
    # Create complete HTML document
    full_html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ganjes DAO - Comprehensive Design Document</title>
        {css_content}
    </head>
    <body>
        <div class="no-print">
            <button class="print-button" onclick="printDocument()">🖨️ Print to PDF</button>
        </div>
        
        <div class="document-header">
            <div class="document-title">Ganjes DAO</div>
            <div class="document-subtitle">Comprehensive Design Document</div>
        </div>
        
        <div class="document-content">
            {html_content}
        </div>
        
        <div class="document-footer">
            <p><strong>Document Version:</strong> 1.0</p>
            <p><strong>Last Updated:</strong> August 7, 2025</p>
            <p><strong>Authors:</strong> Ganjes Development Team</p>
        </div>
        
        {javascript}
    </body>
    </html>
    """
    
    # Write HTML file
    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(full_html)
    
    return True

def main():
    # File paths
    markdown_file = "GANJES_DAO_DESIGN_DOCUMENT.md"
    html_file = "GANJES_DAO_DESIGN_DOCUMENT.html"
    
    # Check if markdown file exists
    if not os.path.exists(markdown_file):
        print(f"❌ Markdown file not found: {markdown_file}")
        return
    
    print("🔄 Converting Ganjes DAO Design Document to HTML...")
    print(f"📖 Input: {markdown_file}")
    print(f"🌐 Output: {html_file}")
    print("-" * 60)
    
    try:
        success = convert_markdown_to_html(markdown_file, html_file)
        
        if success:
            print("✅ HTML conversion completed successfully!")
            print(f"🌐 HTML saved as: {html_file}")
            print()
            print("📄 To create PDF:")
            print("1. Open the HTML file in your browser")
            print("2. Click the 'Print to PDF' button, or")
            print("3. Use browser's Print menu → Save as PDF")
            print("4. Choose 'Save as PDF' in print dialog")
            print()
            print("🎨 The HTML includes:")
            print("  • Professional styling and layout")
            print("  • Print-optimized CSS")
            print("  • Interactive print button")
            print("  • Responsive design")
            print("  • Enhanced typography")
        
    except Exception as e:
        print(f"❌ Error during conversion: {str(e)}")

if __name__ == "__main__":
    main()