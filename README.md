# Markdown-ify

A bookmarklet that converts web pages to markdown with enhanced formatting.

## Features

- Uses Mozilla's Readability to extract the main content from web pages
- Converts HTML to well-formatted markdown using Turndown
- Preserves tables, code blocks, lists, and other complex structures
- Includes images in a carousel with download and copy options
- One-click copy button for the entire markdown content
- Works on articles, blog posts, documentation, product pages, and more
- Completely runs in your browser - no server requests for your content

## Installation

### Using the pre-built bookmarklet

1. Visit the [Markdown-ify installation page](https://agentscode.dev/markdown-ify/)
2. Drag the "Markdown-ify" button to your bookmarks bar
3. Navigate to any web page you want to convert
4. Click the bookmark to convert the page to markdown

### Building from source

Clone this repository and install dependencies:

```bash
git clone https://github.com/yourname/markdown-ify.git
cd markdown-ify
npm install
```

## Development

This project offers multiple approaches for development:

### Development Server

Start the development server:

```bash
npm run dev
```

This opens a test page in your browser with options for testing:

- **Direct Testing**: Loads the script directly for immediate testing
- **Loader Testing**: Tests a loader approach that fetches the latest version of the script
- **Production Testing**: Tests the production (minified) build

### Building for Production

```bash
# Build the full bookmarklet (embedded code)
npm run build:all
```

This generates several files in the `dist` directory:
- `markdown-ify.min.js` - Minified production build
- `markdown-ify.bookmarklet.js` - Bookmarklet with embedded code
- `install.html` - Installation page for the embedded bookmarklet
- `markdown-ify-loader.js` - Loader bookmarklet that fetches the latest version
- `install-loader.html` - Installation page for the loader bookmarklet

### Testing the Production Build

To test the production build locally:

1. Build the files:
   ```bash
   npm run build:all
   ```

2. Start a local server to serve the files:
   ```bash
   npm run serve
   ```

3. Visit http://localhost:8080/install.html for the full embedded bookmarklet
   or http://localhost:8080/install-loader.html for the loader version

4. Drag the bookmarklet to your bookmarks bar

5. Navigate to any website and click the bookmarklet to test it

### Troubleshooting

If you encounter issues with the bookmarklet:

- **Network errors**: Make sure your server is running when testing the loader version
  - For development testing: ensure `npm run dev` is running
  - For production testing: ensure `npm run serve` is running

- **Analytics errors**: The bookmarklet may show ERR_BLOCKED_BY_CLIENT errors in the console if you have an ad blocker enabled. These are non-critical and won't affect the core functionality.

- **CORS issues**: If testing on certain websites, you may encounter CORS errors when loading images. This is normal and won't affect the markdown conversion.

## Deployment Options

### Option 1: Static Hosting (Embedded Code)

Host the `install.html` file on any static hosting provider. Users can visit this page and drag the bookmarklet to their bookmarks bar. All code is embedded in the bookmarklet, so no additional hosting is required.

### Option 2: Dynamic Loader (Remote Code)

1. Host the `markdown-ify.min.js` file on a server that supports CORS
2. Update the `IMPLEMENTATION_URL` in `scripts/create-loader-bookmarklet.js` to point to your hosted file
3. Rebuild the loader bookmarklet:
   ```bash
   npm run build:loader
   ```
4. Host the `install-loader.html` file

With this approach, users install a small loader bookmarklet that fetches the latest version of the code each time it's used. This allows you to update the implementation without requiring users to reinstall the bookmarklet.

## License

MIT

## Credits

Built by [AgentsCode.dev](https://agentscode.dev)