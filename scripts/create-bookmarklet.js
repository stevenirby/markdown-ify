import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createBookmarklet = () => {
  // Read the built file
  const filePath = path.join(__dirname, '../dist/markdown-ify.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Wrap the content in an IIFE
  content = `(function(){${content}})();`;

  // Create the bookmarklet
  const bookmarklet = `javascript:${encodeURIComponent(content)}`;

  // Write the bookmarklet to a file
  fs.writeFileSync(path.join(__dirname, '../dist/bookmarklet.txt'), bookmarklet);

  // Create an HTML page to make it easy to drag the bookmarklet
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown-ify Bookmarklet</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1 {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 0.5rem;
      color: #1e40af;
    }
    .bookmarklet {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 8px 16px;
      text-decoration: none;
      border-radius: 4px;
      margin: 1rem 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      font-weight: bold;
    }
    .bookmarklet:hover {
      background-color: #1e40af;
    }
    .instructions {
      background-color: #f3f4f6;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
    }
    .instructions ol {
      margin: 0;
      padding-left: 1.5rem;
    }
    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
      font-size: 0.875rem;
      color: #6b7280;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <h1>Markdown-ify Bookmarklet</h1>
  <p>This bookmarklet allows you to convert any webpage into clean markdown with a single click.</p>

  <div class="instructions">
    <h2>Installation Instructions:</h2>
    <ol>
      <li>Drag the following link to your bookmarks bar: <a href="${bookmarklet}" class="bookmarklet">Markdown-ify</a></li>
      <li>Navigate to any webpage you want to convert</li>
      <li>Click the "Markdown-ify" bookmark in your bookmarks bar</li>
      <li>The page will be converted to markdown format</li>
    </ol>
  </div>

  <div class="footer">
    <p>Built by <a href="https://agentscode.dev" target="_blank" rel="noopener noreferrer">AgentsCode.dev</a></p>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, '../dist/index.html'), html);

  console.log('Bookmarklet created successfully!');
  console.log('- Bookmarklet code saved to dist/bookmarklet.txt');
  console.log('- Installation page saved to dist/index.html');
};

createBookmarklet();