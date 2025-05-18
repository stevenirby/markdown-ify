#!/usr/bin/env node
/**
 * Development Server for Markdown-ify
 * Provides a test page to develop and test the bookmarklet
 */

import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import * as open from 'open';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use createRequire to import JSON
const require = createRequire(import.meta.url);
// Package info if needed later
// const packageJson = require('../package.json');

// Paths
const DIST_DIR = resolve(__dirname, '..', 'dist');
const TEST_PAGE_PORT = 4000; // Changed from 3000 to avoid conflicts
const TEST_PAGE_URL = `http://localhost:${TEST_PAGE_PORT}`;

// Main function
async function startDevServer() {
  try {
    console.log('🔨 Starting development server...');

    // Build the bookmarklet in development mode
    execSync('npm run build', { stdio: 'inherit' });

    // Check if bookmarklet file exists
    const bookmarkletFile = join(DIST_DIR, 'markdown-ify.js');
    if (!existsSync(bookmarkletFile)) {
      console.error('❌ Bookmarklet file not found. Build process may have failed.');
      process.exit(1);
    }

    // Start a simple HTTP server
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', TEST_PAGE_URL);

      // Set CORS headers to allow loading from any domain
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle OPTIONS requests (for CORS)
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Serve the JavaScript file
      if (url.pathname === '/markdown-ify.js') {
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(readFileSync(bookmarkletFile, 'utf8'));
        return;
      }

      // Serve the minified JavaScript file
      if (url.pathname === '/markdown-ify.min.js') {
        const minFile = join(DIST_DIR, 'markdown-ify.min.js');
        if (existsSync(minFile)) {
          res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          });
          res.end(readFileSync(minFile, 'utf8'));
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found. Run npm run build:prod first.');
        }
        return;
      }

      // Serve the test page
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(generateTestPage());
    });

    server.listen(TEST_PAGE_PORT, () => {
      console.log(`✅ Development server running at ${TEST_PAGE_URL}`);
      console.log('🔍 Opening test page in browser...');

      // Open the browser
      open.default(TEST_PAGE_URL);
    });

    // Handle server shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down development server...');
      server.close(() => {
        console.log('👋 Goodbye!');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Development server failed:', error);
    process.exit(1);
  }
}

/**
 * Generate a test page for bookmarklet development
 *
 * @returns HTML content for the test page
 */
function generateTestPage() {
  // Create bookmarklet code variants
  const directBookmarklet = `javascript:(function(){var s=document.createElement('script');s.src='http://localhost:${TEST_PAGE_PORT}/markdown-ify.js?'+Math.random();document.body.appendChild(s)})();`;

  const loaderBookmarklet = `javascript:(function(){
    var loader = document.createElement('div');
    loader.style.position = 'fixed';
    loader.style.top = '20px';
    loader.style.right = '20px';
    loader.style.backgroundColor = '#fff';
    loader.style.padding = '10px';
    loader.style.borderRadius = '4px';
    loader.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    loader.style.zIndex = '9999999999';
    loader.textContent = 'Loading Markdown-ify...';
    document.body.appendChild(loader);

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    var timestamp = new Date().getTime();
    script.src = 'http://localhost:${TEST_PAGE_PORT}/markdown-ify.js?' + timestamp;

    script.onload = function() {
      if (document.body.contains(loader)) {
        document.body.removeChild(loader);
      }
    };

    script.onerror = function() {
      loader.textContent = 'Error loading Markdown-ify';
      loader.style.backgroundColor = '#ffebee';
      loader.style.color = '#c62828';
      setTimeout(function() {
        if (document.body.contains(loader)) {
          document.body.removeChild(loader);
        }
      }, 3000);
    };

    document.head.appendChild(script);
  })();`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown-ify Development</title>
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
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      margin: 20px 0;
    }
    .bookmarklet:hover {
      background-color: #0256bf;
    }
    button.test {
      display: inline-block;
      padding: 8px 16px;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      margin: 20px 0;
    }
    button.test:hover {
      background-color: #218838;
    }
    .instructions {
      background-color: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
    .tab-container {
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      margin: 20px 0;
      overflow: hidden;
    }
    .tab-header {
      display: flex;
      background-color: #f6f8fa;
      border-bottom: 1px solid #e1e4e8;
    }
    .tab-button {
      padding: 10px 20px;
      background: none;
      border: none;
      border-right: 1px solid #e1e4e8;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      outline: none;
    }
    .tab-button.active {
      background-color: #fff;
      border-bottom: 2px solid #0366d6;
      margin-bottom: -1px;
    }
    .tab-content {
      padding: 16px;
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    code {
      background-color: #f1f1f1;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
    }
    .test-content {
      margin-top: 40px;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f6f8fa;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow: auto;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 16px;
      margin-left: 0;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>Markdown-ify Development</h1>
  <p>This page is for testing and developing the Markdown-ify bookmarklet.</p>

  <div class="tab-container">
    <div class="tab-header">
      <button class="tab-button active" onclick="openTab(event, 'direct-tab')">Direct Testing</button>
      <button class="tab-button" onclick="openTab(event, 'loader-tab')">Loader Testing</button>
      <button class="tab-button" onclick="openTab(event, 'production-tab')">Production Testing</button>
    </div>

    <div id="direct-tab" class="tab-content active">
      <h2>Direct Script Testing</h2>
      <p>This loads the development version of the script directly.</p>
      <button class="test" onclick="testBookmarklet()">Test Bookmarklet</button>
      <p>Drag this to your bookmarks bar for testing on other pages:</p>
      <a class="bookmarklet" href="${directBookmarklet}" title="Markdown-ify (Dev)">
        Markdown-ify (Dev)
      </a>
    </div>

    <div id="loader-tab" class="tab-content">
      <h2>Loader Testing</h2>
      <p>This uses a loader approach that fetches the script from your local development server.</p>
      <button class="test" onclick="testLoaderBookmarklet()">Test Loader</button>
      <p>Drag this to your bookmarks bar for testing the loader approach:</p>
      <a class="bookmarklet" href="${loaderBookmarklet}" title="Markdown-ify (Loader)">
        Markdown-ify (Loader)
      </a>
    </div>

    <div id="production-tab" class="tab-content">
      <h2>Production Build Testing</h2>
      <p>This uses the minified production build. You need to run <code>npm run build:prod</code> first.</p>
      <button class="test" onclick="testProductionBuild()">Test Production Build</button>
      <p>To test the full production loader approach:</p>
      <ol>
        <li>Run <code>npm run build:all</code> to build all assets</li>
        <li>Run <code>npm run serve</code> in a separate terminal to serve the built files</li>
        <li>Open <code>http://localhost:8080/install-loader.html</code> and use the bookmarklet there</li>
      </ol>
    </div>
  </div>

  <div class="test-content">
    <h1>Test Content for Markdown Conversion</h1>
    <p>This is a sample article with various HTML elements to test the markdown conversion.</p>

    <h2>Headings and Paragraphs</h2>
    <p>This is a paragraph of text. It includes <strong>bold text</strong>, <em>italic text</em>, and <a href="https://example.com">links</a>.</p>

    <h3>Lists</h3>
    <ul>
      <li>Unordered list item 1</li>
      <li>Unordered list item 2
        <ul>
          <li>Nested unordered list item</li>
          <li>Another nested item</li>
        </ul>
      </li>
      <li>Unordered list item 3</li>
    </ul>

    <ol>
      <li>Ordered list item 1</li>
      <li>Ordered list item 2
        <ol>
          <li>Nested ordered list item</li>
          <li>Another nested ordered item</li>
        </ol>
      </li>
      <li>Ordered list item 3</li>
    </ol>

    <h3>Task Lists</h3>
    <ul>
      <li><input type="checkbox" checked> Completed task</li>
      <li><input type="checkbox"> Incomplete task</li>
    </ul>

    <h3>Code</h3>
    <p>Here's an example of <code>inline code</code>.</p>

    <pre><code class="language-javascript">// This is a code block
function example() {
  console.log("Hello, world!");
  return true;
}</code></pre>

    <h3>Blockquotes</h3>
    <blockquote>
      <p>This is a blockquote.</p>
      <p>It can contain multiple paragraphs.</p>
    </blockquote>

    <h3>Tables</h3>
    <table>
      <thead>
        <tr>
          <th>Header 1</th>
          <th>Header 2</th>
          <th>Header 3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Row 1, Cell 1</td>
          <td>Row 1, Cell 2</td>
          <td>Row 1, Cell 3</td>
        </tr>
        <tr>
          <td>Row 2, Cell 1</td>
          <td>Row 2, Cell 2</td>
          <td>Row 2, Cell 3</td>
        </tr>
      </tbody>
    </table>

    <h3>Images</h3>
    <figure>
      <img src="https://via.placeholder.com/640x360" alt="Example image" width="640" height="360">
      <figcaption>This is a figure caption for the image above.</figcaption>
    </figure>

    <h3>Definition Lists</h3>
    <dl>
      <dt>Term 1</dt>
      <dd>Definition 1</dd>
      <dt>Term 2</dt>
      <dd>Definition 2</dd>
    </dl>
  </div>

  <script>
    // Function to test the bookmarklet directly
    function testBookmarklet() {
      var script = document.createElement('script');
      script.src = '/markdown-ify.js?' + Math.random();
      document.body.appendChild(script);
    }

    // Function to test the loader approach
    function testLoaderBookmarklet() {
      ${loaderBookmarklet.replace('javascript:', '')}
    }

    // Function to test the production build
    function testProductionBuild() {
      var script = document.createElement('script');
      script.src = '/markdown-ify.min.js?' + Math.random();
      script.onerror = function() {
        alert('Production build not found. Run npm run build:prod first.');
      };
      document.body.appendChild(script);
    }

    // Tab functionality
    function openTab(evt, tabId) {
      var i, tabContent, tabButtons;

      // Hide all tab content
      tabContent = document.getElementsByClassName("tab-content");
      for (i = 0; i < tabContent.length; i++) {
        tabContent[i].className = tabContent[i].className.replace(" active", "");
      }

      // Remove active class from all tab buttons
      tabButtons = document.getElementsByClassName("tab-button");
      for (i = 0; i < tabButtons.length; i++) {
        tabButtons[i].className = tabButtons[i].className.replace(" active", "");
      }

      // Show the current tab and add active class to the button
      document.getElementById(tabId).className += " active";
      evt.currentTarget.className += " active";
    }
  </script>
</body>
</html>`;
}

// Run the server
startDevServer();