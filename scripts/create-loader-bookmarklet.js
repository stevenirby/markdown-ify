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

  // Create the minimal loader code
  // This fetches and executes the latest version
  const loaderCode = `
javascript:(function(){
  // Show loading notification
  var loader = document.createElement('div');
  loader.style.position = 'fixed';
  loader.style.top = '20px';
  loader.style.right = '20px';
  loader.style.backgroundColor = '#fff';
  loader.style.padding = '10px';
  loader.style.borderRadius = '4px';
  loader.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  loader.style.zIndex = '9999999999';
  loader.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  loader.textContent = 'Loading Markdown-ify...';
  document.body.appendChild(loader);

  // Function to load and execute the script with timeout
  function loadScript(url, callback) {
    var timeoutId;
    var hasCompleted = false;

    // Create script element
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;

    // Add timestamp parameter to bypass cache
    var timestamp = new Date().getTime();
    var cacheBypassUrl = url + (url.indexOf('?') === -1 ? '?' : '&') + timestamp;

    script.src = cacheBypassUrl;

    // Set up timeout for script loading
    timeoutId = setTimeout(function() {
      if (!hasCompleted) {
        hasCompleted = true;
        handleError('Loading timed out after 10 seconds. Server may be unavailable.');
      }
    }, 10000);

    script.onload = function() {
      if (!hasCompleted) {
        hasCompleted = true;
        clearTimeout(timeoutId);
        if (callback) callback();
      }
    };

    script.onerror = function() {
      if (!hasCompleted) {
        hasCompleted = true;
        clearTimeout(timeoutId);
        handleError('Failed to load script. Server may be unavailable.');
      }
    };

    document.head.appendChild(script);
  }

  // Error handler
  function handleError(message) {
    console.error('Markdown-ify error:', message);
    loader.textContent = 'Error: ' + message;
    loader.style.backgroundColor = '#ffebee';
    loader.style.color = '#c62828';

    // Add a close button
    var closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.marginLeft = '8px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.fontWeight = 'bold';
    closeButton.onclick = function() {
      if (document.body.contains(loader)) {
        document.body.removeChild(loader);
      }
    };
    loader.appendChild(closeButton);

    // Auto remove after 8 seconds
    setTimeout(function() {
      if (document.body.contains(loader)) {
        document.body.removeChild(loader);
      }
    }, 8000);

    // Attempt to run the fallback version if available
    tryFallbackVersion();
  }

  // Try to load a fallback version that's embedded
  function tryFallbackVersion() {
    if (window.markdownify && typeof window.markdownify.init === 'function') {
      console.log('Using already loaded version of Markdown-ify');
      window.markdownify.init();
    } else {
      console.error('No fallback version of Markdown-ify available');
    }
  }

  // Load the full implementation
  loadScript('${IMPLEMENTATION_URL}', function() {
    // Remove loader when script is loaded
    if (document.body.contains(loader)) {
      document.body.removeChild(loader);
    }
  });
})();
`.trim();

  // Write loader to file
  writeFileSync(LOADER_PATH, loaderCode);
  console.log(`📝 Loader bookmarklet created: ${LOADER_PATH}`);

  // Generate install HTML
  generateInstallHTML(loaderCode);

  console.log('✅ Loader bookmarklet creation complete!');
}

/**
 * Generate installation HTML for the loader
 *
 * @param {string} bookmarkletCode The bookmarklet code
 */
function generateInstallHTML(bookmarkletCode) {
  // Properly encode the bookmarklet for HTML attribute
  const encodedBookmarklet = bookmarkletCode.replace(/"/g, '&quot;');

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
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      margin: 20px 0;
    }
    .bookmarklet:hover {
      background-color: #0256bf;
    }
    .instructions {
      background-color: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
    .warning {
      background-color: #fff8c5;
      border-left: 4px solid #f1c40f;
      padding: 12px 16px;
      margin: 20px 0;
    }
    .note {
      background-color: #e7f5ff;
      border-left: 4px solid #4dabf7;
      padding: 12px 16px;
      margin: 20px 0;
    }
    code {
      background-color: #f1f1f1;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
    }
    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>Markdown-ify Loader Bookmarklet</h1>
  <p>This bookmarklet always loads the latest version of Markdown-ify from:</p>
  <code>${IMPLEMENTATION_URL}</code>

  <div class="instructions">
    <h2>Installation Instructions</h2>
    <ol>
      <li>Drag the button below to your browser's bookmarks bar:
        <a class="bookmarklet" href="${encodedBookmarklet}" title="Markdown-ify">
          Markdown-ify
        </a>
      </li>
      <li>Navigate to any web page you want to convert</li>
      <li>Click the bookmark to convert the page to markdown</li>
    </ol>

    <div class="warning">
      <strong>Note:</strong> This version will always fetch the latest code. If your network is offline or the server is down, it won't work.
    </div>

    <div class="note">
      <strong>Troubleshooting:</strong> If you see errors about analytics or other services being blocked, this is normal if you're using an ad blocker.
      The bookmarklet will still function correctly despite these errors.
    </div>
  </div>

  <h2>Features</h2>
  <ul>
    <li>Always loads the latest version of the code</li>
    <li>No need to reinstall when updates are made to the implementation</li>
    <li>Uses Mozilla's Readability to extract the main content from any web page</li>
    <li>Converts HTML to well-formatted markdown using Turndown</li>
    <li>Preserves tables, code blocks, lists, and other complex structures</li>
    <li>Includes images in a carousel with download and copy options</li>
  </ul>

  <footer>
    <p>Version: ${packageJson.version} | &copy; ${new Date().getFullYear()} <a href="https://agentscode.dev" target="_blank">AgentsCode.dev</a></p>
  </footer>
</body>
</html>`;

  writeFileSync(INSTALL_LOADER_PATH, htmlContent);
  console.log(`📝 Generated loader installation HTML: ${INSTALL_LOADER_PATH}`);
}

// Execute the script
createLoaderBookmarklet();