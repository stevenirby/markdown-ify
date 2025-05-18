/**
 * Dependencies management
 * Defines and loads required external resources for Markdown-ify
 */

import { loadResources, ScriptResource, StyleResource, unloadResources } from './resourceLoader';

// CDN URLs for external dependencies
// Using unpkg.com as primary CDN and jsDelivr as fallback
// These are kept for potential future use if we switch to dynamic loading
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CDN_URLS = {
  // We don't need to load these externally since they're bundled,
  // but keeping for reference in case we need CDN loading in the future
  READABILITY: {
    primary: 'https://unpkg.com/@mozilla/readability@0.6.0/Readability.js',
    fallback: 'https://cdn.jsdelivr.net/npm/@mozilla/readability@0.6.0/Readability.min.js',
  },
  TURNDOWN: {
    primary: 'https://unpkg.com/turndown@7.2.0/dist/turndown.js',
    fallback: 'https://cdn.jsdelivr.net/npm/turndown@7.2.0/dist/turndown.min.js',
  },
  DOMPURIFY: {
    primary: 'https://unpkg.com/dompurify@3.2.5/dist/purify.min.js',
    fallback: 'https://cdn.jsdelivr.net/npm/dompurify@3.2.5/dist/purify.min.js',
  },
};

// Styles for the bookmarklet UI
const BOOKMARKLET_STYLES: StyleResource = {
  id: 'markdownify-styles',
  type: 'style',
  href: 'data:text/css;base64,Lm1hcmtkb3duaWZ5LWNvbnRhaW5lcnsKICBwb3NpdGlvbjpmaXhlZDsKICB0b3A6MDsKICBsZWZ0OjA7CiAgcmlnaHQ6MDsKICBib3R0b206MDsKICB6LWluZGV4Ojk5OTk5OTk5OTsKICBiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMCwwLDAsMC43NSk7CiAgZGlzcGxheTpmbGV4OwogIGp1c3RpZnktY29udGVudDpjZW50ZXI7CiAgYWxpZ24taXRlbXM6Y2VudGVyOwp9Ci5tYXJrZG93bmlmeS1tb2RhbHsKICBiYWNrZ3JvdW5kLWNvbG9yOiNmZmY7CiAgYm9yZGVyLXJhZGl1czo4cHg7CiAgd2lkdGg6ODB2dzsKICBtYXgtd2lkdGg6OTAwcHg7CiAgbWF4LWhlaWdodDo5MHZoOwogIGRpc3BsYXk6ZmxleDsKICBmbGV4LWRpcmVjdGlvbjpjb2x1bW47CiAgb3ZlcmZsb3c6aGlkZGVuOwogIGJveC1zaGFkb3c6MCA0cHggMjRweCByZ2JhKDAsMCwwLDAuMzUpOwp9Ci5tYXJrZG93bmlmeS1oZWFkZXJ7CiAgcGFkZGluZzoxNnB4OwogIGJvcmRlci1ib3R0b206MXB4IHNvbGlkICNlZWU7CiAgZGlzcGxheTpmbGV4OwogIGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOwogIGFsaWduLWl0ZW1zOmNlbnRlcjsKfQoubWFya2Rvd25pZnktY29udGVudHsKICBwYWRkaW5nOjE2cHg7CiAgb3ZlcmZsb3cteTphdXRvOwogIGZsZXg6MSAxIGF1dG87CiAgZm9udC1mYW1pbHk6bW9ub3NwYWNlOwogIHdoaXRlLXNwYWNlOnByZS13cmFwOwp9Ci5tYXJrZG93bmlmeS1mb290ZXJ7CiAgcGFkZGluZzoxNnB4OwogIGJvcmRlci10b3A6MXB4IHNvbGlkICNlZWU7CiAgZGlzcGxheTpmbGV4OwogIGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOwogIGFsaWduLWl0ZW1zOmNlbnRlcjsKfQoubWFya2Rvd25pZnktYnRuewogIHBhZGRpbmc6OHB4IDE2cHg7CiAgYm9yZGVyLXJhZGl1czo0cHg7CiAgYm9yZGVyOm5vbmU7CiAgY3Vyc29yOnBvaW50ZXI7CiAgZm9udC13ZWlnaHQ6NTAwOwp9Ci5tYXJrZG93bmlmeS1idG4tcHJpbWFyeXsKICBiYWNrZ3JvdW5kLWNvbG9yOiMwMzY2ZDY7CiAgY29sb3I6I2ZmZjsKfQoubWFya2Rvd25pZnktYnRuLXNlY29uZGFyeXsKICBiYWNrZ3JvdW5kLWNvbG9yOiNmMWYzZjQ7CiAgY29sb3I6IzMzMzsKfQoubWFya2Rvd25pZnktbG9hZGVyewogIHBvc2l0aW9uOmZpeGVkOwogIHRvcDoyMHB4OwogIHJpZ2h0OjIwcHg7CiAgYmFja2dyb3VuZC1jb2xvcjojZmZmOwogIGJvcmRlci1yYWRpdXM6NHB4OwogIHBhZGRpbmc6OHB4IDE2cHg7CiAgYm94LXNoYWRvdzowIDJweCA4cHggcmdiYSgwLDAsMCwwLjEpOwogIGNvbG9yOiMzMzM7CiAgei1pbmRleDo5OTk5OTk5OTk7CiAgZm9udC1mYW1pbHk6LWFwcGxlLXN5c3RlbSxCbGlua01hY1N5c3RlbUZvbnQsJ1NlZ29lIFVJJyxSb2JvdG8sT3h5Z2VuLFVidW50dSxDYW50YXJlbGwsJ09wZW4gU2FucycsJ0hlbHZldGljYSBOZXVlJyxzYW5zLXNlcmlmOwp9Ci5tYXJrZG93bmlmeS1icmFuZGluZ3sKICBmb250LXNpemU6MTJweDsKICBjb2xvcjojNjY2OwogIHRleHQtZGVjb3JhdGlvbjpub25lOwp9',
  loaded: false,
};

/**
 * Load all required external dependencies
 *
 * @returns Promise that resolves when all dependencies are loaded
 */
export async function loadDependencies(): Promise<void> {
  const resources: (ScriptResource | StyleResource)[] = [
    // We're loading the required dependencies through webpack in this version
    // But we still need to load our styles
    BOOKMARKLET_STYLES,
  ];

  // Load all resources in parallel
  return loadResources(resources);
}

/**
 * Remove all loaded dependencies
 */
export function unloadDependencies(): void {
  unloadResources();
}

/**
 * Display a loading indicator
 *
 * @param message Message to display
 * @returns The loader element
 */
export function showLoader(message: string = 'Processing page...'): HTMLElement {
  const loader = document.createElement('div');
  loader.id = 'markdownify-loader';
  loader.className = 'markdownify-loader';
  loader.textContent = message;
  document.body.appendChild(loader);
  return loader;
}

/**
 * Remove the loading indicator
 */
export function removeLoader(): void {
  const loader = document.getElementById('markdownify-loader');
  if (loader && loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
}