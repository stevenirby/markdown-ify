#!/usr/bin/env node
/**
 * Build Bookmarklet Script
 * This script builds the bookmarklet and generates installation files
 */

import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use createRequire to import JSON
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

// Paths
const DIST_DIR = resolve(__dirname, '..', 'dist');
const BOOKMARKLET_PATH = join(DIST_DIR, 'markdown-ify.bookmarklet.js');
const INSTALL_PATH = join(DIST_DIR, 'install.html');
const README_PATH = join(DIST_DIR, 'README.md');

// Main function
async function buildBookmarklet() {
  try {
    console.log('🔨 Building bookmarklet...');

    // Ensure dist directory exists
    if (!existsSync(DIST_DIR)) {
      mkdirSync(DIST_DIR, { recursive: true });
    }

    // Build production version
    execSync('npm run build:prod', { stdio: 'inherit' });

    // Check if bookmarklet file exists
    if (!existsSync(BOOKMARKLET_PATH)) {
      console.error('❌ Bookmarklet file not found. Build process may have failed.');
      process.exit(1);
    }

    // Read the bookmarklet code
    const bookmarkletCode = readFileSync(BOOKMARKLET_PATH, 'utf8');

    // Generate and write the installation HTML
    const htmlContent = generateInstallHTML(bookmarkletCode);
    writeFileSync(INSTALL_PATH, htmlContent);
    console.log(`📝 Generated installation HTML: ${INSTALL_PATH}`);

    // Generate README
    generateReadme();

    console.log('✅ Bookmarklet build complete!');
    console.log(`📁 Bookmarklet file: ${BOOKMARKLET_PATH}`);
    console.log(`📁 Installation page: ${INSTALL_PATH}`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

/**
 * Generate installation HTML file
 *
 * @param {string} bookmarkletCode The bookmarklet code
 */
function generateInstallHTML(bookmarkletCode) {
  // Ensure bookmarklet code has javascript: prefix
  const formattedBookmarklet = bookmarkletCode.startsWith('javascript:')
    ? bookmarkletCode
    : `javascript:${bookmarkletCode}`;

  // Properly encode special characters for HTML attribute
  const encodedBookmarklet = formattedBookmarklet
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown-ify Bookmarklet Installation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1, h2 {
      color: #0366d6;
    }
    .bookmarklet {
      display: inline-block;
      padding: 8px 16px;
      background-color: #0366d6;
      color: white;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 500;
      margin: 8px 0;
    }
    .bookmarklet:hover {
      background-color: #0256bf;
    }
    ol li {
      margin-bottom: 10px;
    }
    .note {
      background-color: #f8f9fa;
      border-left: 4px solid #17a2b8;
      padding: 15px;
      margin-bottom: 20px;
    }
    footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    footer a {
      color: #0366d6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <h1>Markdown-ify Installation</h1>

  <div class="note">
    <p>Markdown-ify is a bookmarklet that converts web pages to well-formatted markdown with a single click.</p>
  </div>

  <h2>Installation Instructions</h2>
  <ol>
    <li>Drag the button below to your bookmarks bar: <a class="bookmarklet" href="${encodedBookmarklet}">Markdown-ify</a></li>
    <li>Navigate to any web page</li>
    <li>Click the bookmark to convert the page to markdown</li>
  </ol>

  <h2>Features</h2>
  <ul>
    <li>Extracts the main content from web pages</li>
    <li>Preserves formatting, links, and images</li>
    <li>Formats tables, code blocks, and other complex structures</li>
    <li>One-click copy for the generated markdown</li>
    <li>Image carousel with download and copy options</li>
  </ul>

  <footer>
    Created by <a href="https://agentscode.dev" target="_blank">AgentsCode.dev</a> | Version: ${packageJson.version}
  </footer>
</body>
</html>`;

  return htmlContent;
}

/**
 * Generate README file
 */
function generateReadme() {
  const readmeContent = `# Markdown-ify Bookmarklet

Version: ${packageJson.version}

## About

Markdown-ify is a bookmarklet that converts web pages to well-formatted markdown with a single click.

## Features

- Uses Mozilla's Readability to extract the main content from any web page
- Converts HTML to markdown using Turndown
- Preserves tables, code blocks, lists, and other complex structures
- Includes images in a carousel with download and copy options
- One-click copy button for the entire markdown content
- Works on articles, blog posts, documentation, product pages, and more
- Completely runs in your browser - no server requests for your content

## Installation

1. Open the \`install.html\` file in your browser
2. Drag the "Markdown-ify" button to your bookmarks bar
3. Navigate to any web page you want to convert
4. Click the bookmark to convert the page to markdown

## Privacy

Markdown-ify respects your privacy:
- All conversion happens locally in your browser
- Your content never leaves your device
- Basic anonymous analytics track only usage patterns (can be disabled)
- No personal data is collected

## Built With

- [Readability](https://github.com/mozilla/readability) - Content extraction
- [Turndown](https://github.com/domchristie/turndown) - HTML to Markdown conversion
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Webpack](https://webpack.js.org/) - Bundling

## License

MIT

---

Built by [AgentsCode.dev](https://agentscode.dev)
`;

  writeFileSync(README_PATH, readmeContent);
  console.log(`📝 Generated README: ${README_PATH}`);
}

// Run the build process
buildBookmarklet();