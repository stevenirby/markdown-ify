/**
 * Fallback Extraction Service
 * Provides alternative content extraction strategies for when primary methods fail
 */

import { ErrorCategory, logError } from '../utils/errorHandler';
import { ExtractionResult } from './readabilityService';
import DOMPurify from 'dompurify';

// Content element candidate with scoring
interface ContentCandidate {
  element: Element;
  score: number;
  textLength: number;
  linkDensity: number;
}

/**
 * Extract content using a heuristic-based approach
 * This is a fallback for when Readability fails
 *
 * @returns Extraction result with content
 */
export function extractContentHeuristic(): ExtractionResult {
  try {
    // Find the best content container
    const contentElement = findMainContentElement();

    if (!contentElement) {
      return createMinimalResult('No main content found');
    }

    // Clean the content
    const cleanedContent = cleanContent(contentElement);

    // Extract text
    const textContent = contentElement.textContent || '';

    // Create excerpt
    const excerpt = createExcerpt(textContent);

    // Get page title
    const title = extractTitle();

    return {
      title,
      content: cleanedContent,
      textContent,
      length: textContent.length,
      excerpt,
      byline: extractByline(),
      dir: document.dir || null,
      siteName: extractSiteName(),
      lang: document.documentElement.lang || null,
      publishedTime: extractPublishedTime(),
      success: true,
      isReadabilityResult: false,
    };
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Heuristic content extraction failed',
      error instanceof Error ? error : new Error(String(error))
    );

    return createMinimalResult('Heuristic extraction failed');
  }
}

/**
 * Extract content by selecting the largest text block
 * This is a simple fallback when other methods fail
 *
 * @returns Extraction result with content
 */
export function extractLargestTextBlock(): ExtractionResult {
  try {
    // Temporary container to hold potential content blocks
    const contentBlocks: Array<{element: Element; length: number}> = [];

    // Query for common content containers
    const potentialContainers = document.querySelectorAll(
      'article, main, #content, #main, .content, .main, .article, .post, .entry, [role="main"]'
    );

    // If no common containers, look for divs and sections with substantial text
    if (potentialContainers.length === 0) {
      document.querySelectorAll('div, section, .post, .entry').forEach(element => {
        const text = element.textContent || '';
        if (text.length > 500) {
          contentBlocks.push({
            element,
            length: text.length,
          });
        }
      });
    } else {
      // Use the common containers
      potentialContainers.forEach(element => {
        contentBlocks.push({
          element,
          length: (element.textContent || '').length,
        });
      });
    }

    // Sort by text length
    contentBlocks.sort((a, b) => b.length - a.length);

    // If no content blocks found, use body
    if (contentBlocks.length === 0) {
      return {
        title: document.title,
        content: DOMPurify.sanitize(document.body.innerHTML),
        textContent: document.body.textContent || '',
        length: (document.body.textContent || '').length,
        excerpt: createExcerpt(document.body.textContent || ''),
        byline: null,
        dir: document.dir || null,
        siteName: null,
        lang: document.documentElement.lang || null,
        publishedTime: null,
        success: true,
        isReadabilityResult: false,
      };
    }

    // Use the largest content block
    const largestBlock = contentBlocks[0].element;
    const cleanedContent = cleanContent(largestBlock);
    const textContent = largestBlock.textContent || '';

    return {
      title: document.title,
      content: cleanedContent,
      textContent,
      length: textContent.length,
      excerpt: createExcerpt(textContent),
      byline: extractByline(),
      dir: document.dir || null,
      siteName: extractSiteName(),
      lang: document.documentElement.lang || null,
      publishedTime: extractPublishedTime(),
      success: true,
      isReadabilityResult: false,
    };
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Largest text block extraction failed',
      error instanceof Error ? error : new Error(String(error))
    );

    return createMinimalResult('Text block extraction failed');
  }
}

/**
 * Extract content using site-specific extraction rules
 *
 * @returns Extraction result with content
 */
export function extractWithSiteRules(): ExtractionResult {
  try {
    const hostname = window.location.hostname;

    // Apply site-specific rules based on hostname
    // Add rules for common sites that might need special handling

    if (hostname.includes('medium.com')) {
      return extractMediumContent();
    }

    if (hostname.includes('github.com')) {
      return extractGithubContent();
    }

    if (hostname.includes('stackoverflow.com') || hostname.includes('stackexchange.com')) {
      return extractStackOverflowContent();
    }

    if (hostname.includes('wikipedia.org')) {
      return extractWikipediaContent();
    }

    // Return null if no site-specific rule matches
    return createMinimalResult('No site-specific rule matches');
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Site-specific extraction failed',
      error instanceof Error ? error : new Error(String(error))
    );

    return createMinimalResult('Site-specific extraction failed');
  }
}

/**
 * Try all fallback strategies in sequence until one succeeds
 *
 * @returns Extraction result with content
 */
export function extractWithFallbackChain(): ExtractionResult {
  // Try the heuristic approach first
  const heuristicResult = extractContentHeuristic();
  if (isSuccessfulExtraction(heuristicResult)) {
    return heuristicResult;
  }

  // Try site-specific rules next
  const siteSpecificResult = extractWithSiteRules();
  if (isSuccessfulExtraction(siteSpecificResult)) {
    return siteSpecificResult;
  }

  // Try largest text block as a last resort
  const largestBlockResult = extractLargestTextBlock();
  if (isSuccessfulExtraction(largestBlockResult)) {
    return largestBlockResult;
  }

  // If all fails, create minimal result
  return createMinimalResult('All extraction methods failed');
}

/**
 * Check if an extraction result is successful and meaningful
 *
 * @param result Extraction result to check
 * @returns Whether the result is successful
 */
function isSuccessfulExtraction(result: ExtractionResult): boolean {
  // Check if extraction succeeded
  if (!result.success) {
    return false;
  }

  // Check if we have meaningful content
  if (!result.content || result.content.trim() === '') {
    return false;
  }

  // Check if we have enough text content
  if (!result.textContent || result.textContent.length < 500) {
    return false;
  }

  return true;
}

/**
 * Create a minimal extraction result with an error message
 *
 * @param errorMessage Error message to include
 * @returns Minimal extraction result
 */
function createMinimalResult(errorMessage: string): ExtractionResult {
  return {
    title: document.title,
    content: `<div class="extraction-error">${errorMessage}</div>${DOMPurify.sanitize(document.body.innerHTML)}`,
    textContent: document.body.textContent || '',
    length: (document.body.textContent || '').length,
    excerpt: createExcerpt(document.body.textContent || ''),
    byline: null,
    dir: document.dir || null,
    siteName: null,
    lang: document.documentElement.lang || null,
    publishedTime: null,
    success: false,
    isReadabilityResult: false,
  };
}

/**
 * Find the main content element of a page using heuristics
 *
 * @returns Main content element or null if not found
 */
function findMainContentElement(): Element | null {
  // Get all elements that could be content
  const contentElements = Array.from(document.body.querySelectorAll('p, article, div, section, main'));

  // Score each element
  const candidates: ContentCandidate[] = contentElements.map(element => {
    // Skip tiny elements
    if ((element.textContent?.length || 0) < 50) {
      return {
        element,
        score: 0,
        textLength: 0,
        linkDensity: 1,
      };
    }

    // Calculate text length
    const textLength = element.textContent?.length || 0;

    // Calculate link density (ratio of link text to all text)
    const linkText = Array.from(element.querySelectorAll('a'))
      .map(a => a.textContent || '')
      .join('').length;

    const linkDensity = textLength > 0 ? linkText / textLength : 1;

    // Calculate initial score
    let score = textLength * (1 - linkDensity);

    // Boost elements with likely content-related classes or IDs
    const classAndId = (element.className + ' ' + element.id).toLowerCase();
    if (/article|content|post|entry|main|text|body/i.test(classAndId)) {
      score *= 1.5;
    }

    // Penalize elements with likely non-content-related classes or IDs
    if (/comment|meta|footer|footnote|sidebar|widget|social|nav|menu|header|ad|banner/i.test(classAndId)) {
      score *= 0.5;
    }

    // Boost elements with more paragraphs
    const paragraphs = element.querySelectorAll('p').length;
    score += paragraphs * 20;

    // Boost elements with headings
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    score += headings * 50;

    return {
      element,
      score,
      textLength,
      linkDensity,
    };
  });

  // Sort by score in descending order
  candidates.sort((a, b) => b.score - a.score);

  // Return the highest scoring element, if any
  return candidates.length > 0 && candidates[0].score > 0 ? candidates[0].element : null;
}

/**
 * Clean content by removing unwanted elements
 *
 * @param element Element to clean
 * @returns Cleaned HTML content
 */
function cleanContent(element: Element): string {
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as Element;

  // Remove unwanted elements
  const unwantedSelectors = [
    '.advertisement', '.ad', '.banner', '.social', '.share', '.comment', '.comments',
    '.related', '.recommended', '.footer', '.nav', '.menu', '.sidebar', '.widget',
    'script', 'style', 'iframe', 'noscript', 'svg',
  ];

  unwantedSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => {
      el.parentNode?.removeChild(el);
    });
  });

  // Sanitize the HTML to remove potentially malicious content
  return DOMPurify.sanitize(clone.innerHTML);
}

/**
 * Create an excerpt from text content
 *
 * @param text Text to create excerpt from
 * @returns Excerpt
 */
function createExcerpt(text: string): string {
  // Get first 200 characters
  const excerpt = text.substring(0, 200).trim();

  // Add ellipsis if text is longer
  return excerpt.length < text.length ? excerpt + '...' : excerpt;
}

/**
 * Extract the title from the page
 *
 * @returns Page title
 */
function extractTitle(): string {
  // Try to get title from the first heading
  const headings = document.querySelectorAll('h1, h2');
  if (headings.length > 0) {
    const headingText = headings[0].textContent?.trim();
    if (headingText && headingText.length > 5) {
      return headingText;
    }
  }

  // Fall back to document title
  return document.title;
}

/**
 * Extract the byline (author) from the page
 *
 * @returns Byline or null if not found
 */
function extractByline(): string | null {
  // Try common author selectors
  const authorSelectors = [
    '.author', '.byline', '.meta-author', '[rel="author"]',
    '[itemprop="author"]', '.post-author', '.entry-author',
  ];

  for (const selector of authorSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      const text = element.textContent.trim();
      if (text.length > 0) {
        return text;
      }
    }
  }

  return null;
}

/**
 * Extract the site name from the page
 *
 * @returns Site name or null if not found
 */
function extractSiteName(): string | null {
  // Try meta tags first
  const metaTags = [
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
    'meta[property="twitter:site"]',
  ];

  for (const selector of metaTags) {
    const metaEl = document.querySelector(selector);
    if (metaEl && metaEl.getAttribute('content')) {
      return metaEl.getAttribute('content');
    }
  }

  // Try common site elements
  const siteNameSelectors = [
    '.site-name', '.site-title', '#site-name', '#site-title',
    '.logo', '.brand', '[itemprop="publisher"]',
  ];

  for (const selector of siteNameSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }

  // Use domain as fallback
  try {
    const hostname = window.location.hostname;
    return hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

/**
 * Extract published time from the page
 *
 * @returns Published time or null if not found
 */
function extractPublishedTime(): string | null {
  // Try meta tags
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
    'meta[property="og:published_time"]',
    'meta[itemprop="datePublished"]',
  ];

  for (const selector of dateSelectors) {
    const metaEl = document.querySelector(selector);
    if (metaEl && metaEl.getAttribute('content')) {
      return metaEl.getAttribute('content');
    }
  }

  // Try time elements
  const timeElements = document.querySelectorAll('time[datetime]');
  for (const timeEl of timeElements) {
    if (timeEl.getAttribute('datetime')) {
      return timeEl.getAttribute('datetime');
    }
  }

  // Try common date elements
  const dateSelectors2 = [
    '.date', '.published', '.pubdate', '.post-date',
    '.entry-date', '[itemprop="datePublished"]',
  ];

  for (const selector of dateSelectors2) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      return element.textContent.trim();
    }
  }

  return null;
}

// Site-specific extraction methods

/**
 * Extract content from Medium articles
 */
function extractMediumContent(): ExtractionResult {
  try {
    // Medium articles have a clear article element
    const article = document.querySelector('article');
    if (!article) {
      return createMinimalResult('Medium article element not found');
    }

    // Get the title
    const title = document.querySelector('h1')?.textContent || document.title;

    // Get the content
    const content = cleanContent(article);

    // Get the text content
    const textContent = article.textContent || '';

    // Get the author
    const author = document.querySelector('[data-testid="authorName"]')?.textContent || null;

    return {
      title,
      content,
      textContent,
      length: textContent.length,
      excerpt: createExcerpt(textContent),
      byline: author,
      dir: document.dir || null,
      siteName: 'Medium',
      lang: document.documentElement.lang || null,
      publishedTime: null,
      success: true,
      isReadabilityResult: false,
    };
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Medium content extraction failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return createMinimalResult('Medium extraction failed');
  }
}

/**
 * Extract content from GitHub
 */
function extractGithubContent(): ExtractionResult {
  try {
    // GitHub has different layouts for different pages
    // For repositories, look for README
    const readme = document.querySelector('#readme');
    if (readme) {
      const title = document.querySelector('h1')?.textContent || document.title;
      const content = cleanContent(readme);
      const textContent = readme.textContent || '';

      return {
        title,
        content,
        textContent,
        length: textContent.length,
        excerpt: createExcerpt(textContent),
        byline: null,
        dir: document.dir || null,
        siteName: 'GitHub',
        lang: document.documentElement.lang || null,
        publishedTime: null,
        success: true,
        isReadabilityResult: false,
      };
    }

    // For issues or pull requests
    const issueBody = document.querySelector('.js-comment-body');
    if (issueBody) {
      const title = document.querySelector('.js-issue-title')?.textContent || document.title;
      const content = cleanContent(issueBody);
      const textContent = issueBody.textContent || '';
      const author = document.querySelector('.author')?.textContent || null;

      return {
        title,
        content,
        textContent,
        length: textContent.length,
        excerpt: createExcerpt(textContent),
        byline: author,
        dir: document.dir || null,
        siteName: 'GitHub',
        lang: document.documentElement.lang || null,
        publishedTime: null,
        success: true,
        isReadabilityResult: false,
      };
    }

    return createMinimalResult('GitHub content not found');
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'GitHub content extraction failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return createMinimalResult('GitHub extraction failed');
  }
}

/**
 * Extract content from Stack Overflow
 */
function extractStackOverflowContent(): ExtractionResult {
  try {
    // Get the question
    const question = document.querySelector('.question');
    if (!question) {
      return createMinimalResult('Stack Overflow question not found');
    }

    // Get the title
    const title = document.querySelector('#question-header h1')?.textContent || document.title;

    // Get the question body
    const questionBody = question.querySelector('.post-text');
    if (!questionBody) {
      return createMinimalResult('Stack Overflow question body not found');
    }

    // Get the answers
    const answers = document.querySelectorAll('.answer');
    let answersContent = '';

    answers.forEach((answer, index) => {
      const answerBody = answer.querySelector('.post-text');
      if (answerBody) {
        answersContent += `<div class="answer"><h3>Answer ${index + 1}</h3>${answerBody.innerHTML}</div>`;
      }
    });

    // Combine question and answers
    const content = `
      <div class="question-body">${questionBody.innerHTML}</div>
      <h2>Answers</h2>
      ${answersContent}
    `;

    // Get the text content
    const textContent = question.textContent || '';

    return {
      title,
      content: DOMPurify.sanitize(content),
      textContent,
      length: textContent.length,
      excerpt: createExcerpt(textContent),
      byline: null,
      dir: document.dir || null,
      siteName: 'Stack Overflow',
      lang: document.documentElement.lang || null,
      publishedTime: null,
      success: true,
      isReadabilityResult: false,
    };
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Stack Overflow content extraction failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return createMinimalResult('Stack Overflow extraction failed');
  }
}

/**
 * Extract content from Wikipedia
 */
function extractWikipediaContent(): ExtractionResult {
  try {
    // Get the content
    const content = document.querySelector('#content');
    if (!content) {
      return createMinimalResult('Wikipedia content not found');
    }

    // Get the title
    const title = document.querySelector('#firstHeading')?.textContent || document.title;

    // Get the main body
    const bodyContent = content.querySelector('#bodyContent');
    if (!bodyContent) {
      return createMinimalResult('Wikipedia body content not found');
    }

    // Clean the content
    const cleanedContent = cleanContent(bodyContent);

    // Get the text content
    const textContent = bodyContent.textContent || '';

    return {
      title,
      content: cleanedContent,
      textContent,
      length: textContent.length,
      excerpt: createExcerpt(textContent),
      byline: null,
      dir: document.dir || null,
      siteName: 'Wikipedia',
      lang: document.documentElement.lang || null,
      publishedTime: null,
      success: true,
      isReadabilityResult: false,
    };
  } catch (error) {
    logError(
      ErrorCategory.CONTENT_EXTRACTION,
      'Wikipedia content extraction failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return createMinimalResult('Wikipedia extraction failed');
  }
}