/**
 * Markdown Custom Rules
 * Specialized rules for Turndown to handle various HTML elements
 */

import TurndownService from 'turndown';

/**
 * Configure custom rules for Turndown service
 *
 * @param turndownService TurndownService instance to configure
 */
export function configureCustomRules(turndownService: TurndownService): void {
  // Add all custom rules
  configureTableRules(turndownService);
  configureCodeRules(turndownService);
  configurePreserveRules(turndownService);
  configureLinkRules(turndownService);
  configureListRules(turndownService);
  configureMediaRules(turndownService);
  configureHeadingRules(turndownService);
  configureBlockquoteRules(turndownService);
  configureSpecialElementRules(turndownService);
}

/**
 * Configure custom table rules
 *
 * @param turndownService TurndownService instance to configure
 */
function configureTableRules(turndownService: TurndownService): void {
  // Preserve tables as markdown tables
  turndownService.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: function(content, _node) {
      // Cast not needed, just using content directly
      return ` ${content.trim()} |`;
    }
  });

  turndownService.addRule('tableRow', {
    filter: 'tr',
    replacement: function(content, node) {
      let output = '|';

      // Trim the last pipe from the content since we're adding our own
      output += content.trim().replace(/\|\s*$/, '');

      // Add newline unless it's a header row that needs alignment markers
      if (node.parentNode?.nodeName.toLowerCase() === 'thead') {
        return output + '\n';
      }

      return output + '\n';
    }
  });

  turndownService.addRule('tableHeader', {
    filter: 'thead',
    replacement: function(content, node) {
      const table = node.parentNode as HTMLTableElement;
      const rows = table.querySelectorAll('tr');

      if (rows.length === 0) {
        return content;
      }

      // Get the number of columns from the first row
      const firstRow = rows[0];
      const cellCount = firstRow.querySelectorAll('th, td').length;

      // Create the alignment row
      let alignmentRow = '|';
      for (let i = 0; i < cellCount; i++) {
        alignmentRow += ' --- |';
      }

      return content + alignmentRow + '\n';
    }
  });

  turndownService.addRule('table', {
    filter: 'table',
    replacement: function(content) {
      return '\n\n' + content + '\n\n';
    }
  });
}

/**
 * Configure custom code rules
 *
 * @param turndownService TurndownService instance to configure
 */
function configureCodeRules(turndownService: TurndownService): void {
  // Inline code
  turndownService.addRule('inlineCode', {
    filter: function(node): boolean {
      const hasSiblings = Boolean(node.previousSibling || node.nextSibling);
      const isCodeBlock = Boolean(node.parentNode?.nodeName.toLowerCase() === 'pre');
      return node.nodeName.toLowerCase() === 'code' && hasSiblings && !isCodeBlock;
    },
    replacement: function(content) {
      if (!content.trim()) return '';
      return '`' + content + '`';
    }
  });

  // Fenced code blocks with language detection
  turndownService.addRule('fencedCodeBlock', {
    filter: function(node): boolean {
      return Boolean(
        node.nodeName.toLowerCase() === 'pre' &&
        node.firstChild &&
        node.firstChild.nodeName.toLowerCase() === 'code'
      );
    },
    replacement: function(content, node) {
      const element = node as HTMLPreElement;
      const code = element.firstChild as HTMLElement;
      let language = '';

      // Try to detect language from class
      const className = code.getAttribute('class') || '';
      if (className) {
        const match = className.match(/language-(\w+)/);
        if (match) {
          language = match[1];
        }
      }

      // Clean content (remove leading/trailing newlines)
      let codeContent = element.textContent || '';
      codeContent = codeContent.replace(/^\n+|\n+$/g, '');

      return '\n\n```' + language + '\n' + codeContent + '\n```\n\n';
    }
  });
}

/**
 * Configure rules to preserve certain HTML elements
 *
 * @param turndownService TurndownService instance to configure
 */
function configurePreserveRules(turndownService: TurndownService): void {
  // Preserve details/summary elements
  turndownService.addRule('details', {
    filter: 'details',
    replacement: function(content) {
      return '\n\n<details>\n' + content + '</details>\n\n';
    }
  });

  turndownService.addRule('summary', {
    filter: 'summary',
    replacement: function(content) {
      return '\n<summary>' + content + '</summary>\n';
    }
  });

  // Preserve math expressions
  turndownService.addRule('mathInline', {
    filter: function(node): boolean {
      if (node.nodeName.toLowerCase() !== 'span') {
        return false;
      }

      const element = node as HTMLElement;
      return !!(
        element.classList.contains('math-inline') ||
        element.classList.contains('math') ||
        element.getAttribute('data-math-type') === 'inline'
      );
    },
    replacement: function(content) {
      return '$' + content + '$';
    }
  });

  turndownService.addRule('mathBlock', {
    filter: function(node): boolean {
      if (node.nodeName.toLowerCase() === 'math') {
        return true;
      }

      if (node.nodeName.toLowerCase() !== 'div') {
        return false;
      }

      const element = node as HTMLElement;
      return !!(
        element.classList.contains('math-block') ||
        element.getAttribute('data-math-type') === 'block'
      );
    },
    replacement: function(content) {
      return '\n\n$$\n' + content + '\n$$\n\n';
    }
  });

  // Preserve line breaks
  turndownService.addRule('lineBreak', {
    filter: 'br',
    replacement: function() {
      return '  \n';
    }
  });
}

/**
 * Configure custom link rules
 *
 * @param turndownService TurndownService instance to configure
 */
function configureLinkRules(turndownService: TurndownService): void {
  // Better handling for links with titles
  turndownService.addRule('links', {
    filter: 'a',
    replacement: function(content, node) {
      const element = node as HTMLAnchorElement;
      const href = element.getAttribute('href');

      // Skip empty or anchor links
      if (!href || href === '#') {
        return content;
      }

      const title = element.title ? ` "${element.title}"` : '';
      return '[' + content + '](' + href + title + ')';
    }
  });

  // Handle footnote links
  turndownService.addRule('footnoteLink', {
    filter: function(node): boolean {
      if (node.nodeName.toLowerCase() !== 'a') {
        return false;
      }

      const element = node as HTMLElement;
      return !!(
        element.classList.contains('footnote') ||
        element.getAttribute('role') === 'doc-noteref'
      );
    },
    replacement: function(content, node) {
      const element = node as HTMLAnchorElement;
      const href = element.getAttribute('href');

      if (!href) {
        return content;
      }

      // Extract footnote number if possible
      const id = href.replace(/^#/, '');
      const number = content.replace(/[^\d]/g, '');

      return '[^' + (number || id) + ']';
    }
  });
}

/**
 * Configure custom list rules
 *
 * @param turndownService TurndownService instance to configure
 */
function configureListRules(turndownService: TurndownService): void {
  // Better handling for task lists
  turndownService.addRule('taskListItems', {
    filter: function(node): boolean {
      return !!(
        node.nodeName.toLowerCase() === 'li' &&
        node.firstChild &&
        node.firstChild.nodeName.toLowerCase() === 'input' &&
        (node.firstChild as HTMLInputElement).type === 'checkbox'
      );
    },
    replacement: function(content, node) {
      const element = node as HTMLLIElement;
      const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
      const isChecked = checkbox ? checkbox.checked : false;

      // Remove the checkbox from the content
      const modifiedContent = content.replace(/^\s*<input[^>]*>\s*/i, '');

      // Ensure proper indentation (2 spaces for every level)
      const listParents = countAncestors(element, 'ul, ol');
      const indent = ' '.repeat(listParents * 2);

      // Construct the task list item
      return '\n' + indent + (isChecked ? '- [x] ' : '- [ ] ') + modifiedContent;
    }
  });

  // Better handling for definition lists
  turndownService.addRule('definitionList', {
    filter: 'dl',
    replacement: function(content) {
      return '\n\n' + content + '\n\n';
    }
  });

  turndownService.addRule('definitionTerm', {
    filter: 'dt',
    replacement: function(content) {
      return '\n\n' + content;
    }
  });

  turndownService.addRule('definitionDescription', {
    filter: 'dd',
    replacement: function(content) {
      return '\n: ' + content;
    }
  });
}

/**
 * Configure custom media rules
 *
 * @param turndownService TurndownService instance to configure
 */
function configureMediaRules(turndownService: TurndownService): void {
  // Enhanced image handling with size
  turndownService.addRule('images', {
    filter: 'img',
    replacement: function(content, node) {
      const element = node as HTMLImageElement;
      const alt = element.getAttribute('alt') || '';
      const src = element.getAttribute('src') || '';

      if (!src) {
        return '';
      }

      const title = element.getAttribute('title');
      const width = element.getAttribute('width');
      const height = element.getAttribute('height');

      let dimensions = '';
      if (width || height) {
        dimensions = ` =${width || ''}x${height || ''}`;
      }

      const titlePart = title ? ` "${title}"` : '';
      return `![${alt}](${src}${titlePart}${dimensions})`;
    }
  });

  // Handle figure/figcaption
  turndownService.addRule('figure', {
    filter: 'figure',
    replacement: function(content, node) {
      // Process captions for figures with images
      const element = node as HTMLElement;
      const img = element.querySelector('img');
      const figcaption = element.querySelector('figcaption');

      if (!img) {
        return '\n\n' + content.trim() + '\n\n';
      }

      // Extract image properties
      const imgAlt = img.getAttribute('alt') || '';
      const imgSrc = img.getAttribute('src') || '';
      const imgTitle = img.getAttribute('title');

      // Build figure with optional caption
      if (figcaption && figcaption.textContent) {
        const caption = figcaption.textContent.trim();
        // Figure with caption - use the figcaption content as title
        return `\n\n![${imgAlt}](${imgSrc} "${caption}")\n\n*${caption}*\n\n`;
      }

      // Regular figure without caption
      const titlePart = imgTitle ? ` "${imgTitle}"` : '';
      return `\n\n![${imgAlt}](${imgSrc}${titlePart})\n\n`;
    }
  });

  // Handle audio elements
  turndownService.addRule('audio', {
    filter: 'audio',
    replacement: function(content, node) {
      const element = node as HTMLAudioElement;
      const src = element.getAttribute('src');

      if (src) {
        return `\n\n[Audio](${src})\n\n`;
      }

      // For audio with multiple sources
      const sources = element.querySelectorAll('source');
      if (sources.length > 0) {
        const mainSource = sources[0].getAttribute('src');
        return `\n\n[Audio](${mainSource})\n\n`;
      }

      return '';
    }
  });

  // Handle video elements
  turndownService.addRule('video', {
    filter: 'video',
    replacement: function(content, node) {
      const element = node as HTMLVideoElement;
      const src = element.getAttribute('src');
      const poster = element.getAttribute('poster');

      if (poster) {
        return `\n\n[![Video](${poster})](${src || poster})\n\n`;
      }

      if (src) {
        return `\n\n[Video](${src})\n\n`;
      }

      // For video with multiple sources
      const sources = element.querySelectorAll('source');
      if (sources.length > 0) {
        const mainSource = sources[0].getAttribute('src');
        return `\n\n[Video](${mainSource})\n\n`;
      }

      return '';
    }
  });
}

/**
 * Configure custom heading rules
 *
 * @param turndownService TurndownService instance to configure
 */
function configureHeadingRules(turndownService: TurndownService): void {
  // Preserve heading IDs
  turndownService.addRule('headings', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: function(content, node) {
      const element = node as HTMLHeadingElement;
      const hLevel = parseInt(node.nodeName.charAt(1));

      if (isNaN(hLevel) || hLevel < 1 || hLevel > 6) {
        return content;
      }

      // Get ID if it exists for generating anchors
      const id = element.getAttribute('id');
      let idPart = '';

      if (id) {
        // Add anchor reference for the ID
        idPart = ` {#${id}}`;
      }

      // Use ATX style (# Heading)
      return '\n\n' + '#'.repeat(hLevel) + ' ' + content + idPart + '\n\n';
    }
  });
}

/**
 * Configure blockquote rules
 *
 * @param turndownService TurndownService instance to configure
 */
function configureBlockquoteRules(turndownService: TurndownService): void {
  // Enhanced blockquote handling (including nested blockquotes)
  turndownService.addRule('blockquotes', {
    filter: 'blockquote',
    replacement: function(content) {
      // Split content by newlines and add > to each line
      const lines = content.trim().split('\n');
      return '\n\n' + lines.map(line => `> ${line}`).join('\n') + '\n\n';
    }
  });
}

/**
 * Configure rules for special HTML elements
 *
 * @param turndownService TurndownService instance to configure
 */
function configureSpecialElementRules(turndownService: TurndownService): void {
  // Handle special elements like aside, abbr, etc.

  // Handle abbreviations
  turndownService.addRule('abbreviations', {
    filter: 'abbr',
    replacement: function(content, node) {
      const element = node as HTMLElement;
      const title = element.getAttribute('title');

      if (title) {
        return `${content} (${title})`;
      }

      return content;
    }
  });

  // Handle mark (highlighted text)
  turndownService.addRule('marks', {
    filter: 'mark',
    replacement: function(content) {
      return `==${content}==`;
    }
  });

  // Handle keyboard input
  turndownService.addRule('keyboard', {
    filter: 'kbd',
    replacement: function(content) {
      return `<kbd>${content}</kbd>`;
    }
  });

  // Handle subscript and superscript
  turndownService.addRule('subscript', {
    filter: 'sub',
    replacement: function(content) {
      return `~${content}~`;
    }
  });

  turndownService.addRule('superscript', {
    filter: 'sup',
    replacement: function(content) {
      return `^${content}^`;
    }
  });

  // Handle horizontal rule with consistent formatting
  turndownService.addRule('horizontalRule', {
    filter: 'hr',
    replacement: function() {
      return '\n\n---\n\n';
    }
  });

  // Handle address elements
  turndownService.addRule('address', {
    filter: 'address',
    replacement: function(content) {
      return '\n\n*' + content.trim() + '*\n\n';
    }
  });

  // Handle cite elements
  turndownService.addRule('cite', {
    filter: 'cite',
    replacement: function(content) {
      return '_' + content + '_';
    }
  });
}

/**
 * Count the number of ancestors matching a selector
 *
 * @param element Element to check
 * @param selector Selector to match
 * @returns Number of ancestors matching the selector
 */
function countAncestors(element: Element, selector: string): number {
  let count = 0;
  let parent = element.parentElement;

  while (parent) {
    if (parent.matches(selector)) {
      count++;
    }
    parent = parent.parentElement;
  }

  return count;
}