#!/usr/bin/env node
/**
 * Create Loader Bookmarklet
 * Generates a minimal bookmarklet that loads the latest version of the code
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

// Configuration
const DIST_DIR = resolve(__dirname, '..', 'dist');
const LOADER_PATH = join(DIST_DIR, 'markdown-ify-loader.js');
const INSTALL_LOADER_PATH = join(DIST_DIR, 'install-loader.html');

// URL where the full implementation will be hosted
// Change this to your actual hosting URL
const IMPLEMENTATION_URL = process.env.IMPLEMENTATION_URL || 'http://localhost:8080/markdown-ify.min.js';

/**
 * Generate loader bookmarklet
 */
function createLoaderBookmarklet() {
  console.log('🔨 Creating loader bookmarklet...');

  // Ensure dist directory exists
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }

  // Create the bookmarklet code (compact, minified)
  const bookmarkletCode = `javascript:(function(){
    const script=document.createElement('script');
    script.src='${IMPLEMENTATION_URL}?t='+Date.now();
    document.body.appendChild(script);
  })();`;

  // Write the bookmarklet to a file
  writeFileSync(LOADER_PATH, bookmarkletCode);
  console.log(`📝 Generated loader bookmarklet: ${LOADER_PATH}`);

  // Generate and write the HTML installation file
  const htmlContent = generateInstallHTML(bookmarkletCode);
  writeFileSync(INSTALL_LOADER_PATH, htmlContent);
  console.log(`📝 Generated loader installation HTML: ${INSTALL_LOADER_PATH}`);

  console.log('✅ Loader bookmarklet creation complete!');
}

/**
 * Generate installation HTML for the loader
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
  <title>Markdown-ify Loader Bookmarklet</title>
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
  <h1>Markdown-ify Loader Installation</h1>

  <div class="note">
    <p>This is the loader version of Markdown-ify that fetches the latest code each time you use it.
    This ensures you always have the latest version without reinstalling.</p>
  </div>

  <h2>Installation Instructions</h2>
  <ol>
    <li>Drag the button below to your bookmarks bar: <a class="bookmarklet" href="${encodedBookmarklet}">Markdown-ify Loader</a></li>
    <li>Navigate to any web page</li>
    <li>Click the bookmark to convert the page to markdown</li>
  </ol>

  <h2>Loader Advantages</h2>
  <ul>
    <li>Always uses the latest version</li>
    <li>Smaller bookmark size</li>
    <li>Automatic updates and fixes</li>
    <li>No need to reinstall when the tool is updated</li>
  </ul>

  <footer>
    Created by <a href="https://agentscode.dev" target="_blank">AgentsCode.dev</a> | Version: ${packageJson.version}
  </footer>
</body>
</html>`;

  return htmlContent;
}

// Execute the script
createLoaderBookmarklet();