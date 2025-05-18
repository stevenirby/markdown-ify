/**
 * Markdown Conversion Service
 * Converts HTML content to Markdown format using Turndown
 */

import TurndownService from 'turndown';
import { ErrorCategory, logError } from '../utils/errorHandler';
import { configureCustomRules } from './markdownCustomRules';
import {
  DEFAULT_TABLE_OPTIONS,
  TableOptions,
  processBlockquote,
  processDefinitionList,
  processNestedList,
  processTable
} from './complexStructureService';

// Options for configuring Turndown conversion
export interface MarkdownOptions {
  headingStyle: 'setext' | 'atx';
  hr: string;
  bulletListMarker: '-' | '+' | '*';
  codeBlockStyle: 'indented' | 'fenced';
  fence: '```' | '~~~';
  emDelimiter: '_' | '*';
  strongDelimiter: '__' | '**';
  linkStyle: 'inlined' | 'referenced';
  linkReferenceStyle: 'full' | 'collapsed' | 'shortcut';
  preserveImageSize?: boolean;
  preserveRelativeLinks?: boolean;
  preserveTableAlignment?: boolean;
  preserveFrontMatter?: boolean;
  tableOptions?: TableOptions;
  processComplexStructures?: boolean;
}

// Default markdown options optimized for readability
export const DEFAULT_MARKDOWN_OPTIONS: MarkdownOptions = {
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full',
  preserveImageSize: true,
  preserveRelativeLinks: true,
  preserveTableAlignment: true,
  preserveFrontMatter: true,
  tableOptions: DEFAULT_TABLE_OPTIONS,
  processComplexStructures: true,
};

/**
 * Markdown Conversion Service
 * Handles the conversion of HTML content to Markdown format
 */
export class MarkdownConversionService {
  private turndownService: TurndownService;
  private options: MarkdownOptions;
  private _preservedContent: Map<string, string>;

  /**
   * Create a new Markdown conversion service
   *
   * @param options Markdown conversion options (optional)
   */
  constructor(options: Partial<MarkdownOptions> = {}) {
    // Merge default options with provided options
    this.options = {
      ...DEFAULT_MARKDOWN_OPTIONS,
      ...options,
      tableOptions: {
        ...DEFAULT_TABLE_OPTIONS,
        ...options.tableOptions,
      },
    };

    // Initialize Turndown with options
    this.turndownService = new TurndownService({
      headingStyle: this.options.headingStyle,
      hr: this.options.hr,
      bulletListMarker: this.options.bulletListMarker,
      codeBlockStyle: this.options.codeBlockStyle,
      fence: this.options.fence,
      emDelimiter: this.options.emDelimiter,
      strongDelimiter: this.options.strongDelimiter,
      linkStyle: this.options.linkStyle,
      linkReferenceStyle: this.options.linkReferenceStyle,
    });

    // Initialize the preserved content map
    this._preservedContent = new Map();

    // Configure custom rules
    this.configureRules();
  }

  /**
   * Pre-process front matter content for preservation
   * Front matter is the YAML metadata at the beginning of a markdown file
   *
   * @param html HTML content to process
   * @returns Object containing processed HTML and extracted front matter
   */
  private extractFrontMatter(html: string): { html: string, frontMatter: string | null } {
    if (!this.options.preserveFrontMatter) {
      return { html, frontMatter: null };
    }

    try {
      // Look for front matter in HTML comments
      const frontMatterRegex = /<!--\s*front-matter\s*\n([\s\S]*?)\n-->/i;
      const match = html.match(frontMatterRegex);

      if (!match) {
        return { html, frontMatter: null };
      }

      // Extract the front matter content
      const frontMatter = match[1].trim();

      // Remove front matter from HTML for normal processing
      const processedHtml = html.replace(match[0], '');

      return {
        html: processedHtml,
        frontMatter: frontMatter
      };
    } catch (error) {
      logError(
        ErrorCategory.MARKDOWN_CONVERSION,
        'Failed to extract front matter',
        error instanceof Error ? error : new Error(String(error))
      );

      return { html, frontMatter: null };
    }
  }

  /**
   * Handle special content that needs to be preserved during conversion
   * This includes LaTeX/MathJax expressions, HTML comments, and other special markup
   *
   * @param html HTML content to process
   * @returns Processed HTML with special content protected
   */
  private preserveSpecialContent(html: string): string {
    if (!html) {
      return '';
    }

    try {
      // Create temporary container
      const container = document.createElement('div');
      container.innerHTML = html;

      // Create a map of placeholders to original content
      const preservedContent: Map<string, string> = new Map();
      let placeholderCounter = 0;

      // Preserve inline math expressions: $...$
      const inlineMathRegex = /\$([^$]+)\$/g;
      html = html.replace(inlineMathRegex, (match, _content) => {
        const placeholder = `MATH_PLACEHOLDER_${placeholderCounter++}`;
        preservedContent.set(placeholder, match);
        return placeholder;
      });

      // Preserve block math expressions: $$...$$
      const blockMathRegex = /\$\$([\s\S]+?)\$\$/g;
      html = html.replace(blockMathRegex, (match, _content) => {
        const placeholder = `MATH_BLOCK_PLACEHOLDER_${placeholderCounter++}`;
        preservedContent.set(placeholder, match);
        return placeholder;
      });

      // Preserve <pre> blocks with special classes (e.g., mermaid, math)
      const specialCodeBlocks = container.querySelectorAll('pre.mermaid, pre.math, pre.graphviz, pre[data-preserve]');
      specialCodeBlocks.forEach(block => {
        const placeholder = `SPECIAL_BLOCK_PLACEHOLDER_${placeholderCounter++}`;
        preservedContent.set(placeholder, block.outerHTML);
        block.outerHTML = placeholder;
      });

      // Preserve HTML comment blocks with data about the source (e.g., for attribution)
      const commentRegex = /<!--\s*@preserve\s*([\s\S]*?)-->/g;
      html = html.replace(commentRegex, (match, content) => {
        const placeholder = `COMMENT_PLACEHOLDER_${placeholderCounter++}`;
        preservedContent.set(placeholder, content.trim());
        return placeholder;
      });

      // Store the map in a property for restoration in post-processing
      this._preservedContent = preservedContent;

      return container.innerHTML;
    } catch (error) {
      logError(
        ErrorCategory.MARKDOWN_CONVERSION,
        'Failed to preserve special content',
        error instanceof Error ? error : new Error(String(error))
      );

      return html;
    }
  }

  /**
   * Restore preserved content that was protected during conversion
   *
   * @param markdown Markdown content with placeholders
   * @returns Markdown with original special content restored
   */
  private restoreSpecialContent(markdown: string): string {
    if (!markdown || !this._preservedContent || this._preservedContent.size === 0) {
      return markdown;
    }

    let result = markdown;

    // Restore each placeholder with its original content
    for (const [placeholder, originalContent] of this._preservedContent.entries()) {
      // For math expressions, keep them as-is
      if (placeholder.startsWith('MATH_PLACEHOLDER_')) {
        result = result.replace(placeholder, originalContent);
      }
      // For math blocks, ensure proper formatting
      else if (placeholder.startsWith('MATH_BLOCK_PLACEHOLDER_')) {
        result = result.replace(placeholder, `\n\n${originalContent}\n\n`);
      }
      // For special blocks (like mermaid diagrams), convert to fenced code blocks
      else if (placeholder.startsWith('SPECIAL_BLOCK_PLACEHOLDER_')) {
        // Extract the content and language from the HTML
        const div = document.createElement('div');
        div.innerHTML = originalContent;
        const pre = div.querySelector('pre');

        if (pre) {
          const lang = Array.from(pre.classList).find(c =>
            ['mermaid', 'math', 'graphviz'].includes(c)
          ) || '';

          const content = pre.textContent || '';
          result = result.replace(placeholder, `\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`);
        } else {
          result = result.replace(placeholder, originalContent);
        }
      }
      // For comments, convert to markdown comments if possible
      else if (placeholder.startsWith('COMMENT_PLACEHOLDER_')) {
        result = result.replace(placeholder, `<!-- ${originalContent} -->`);
      }
    }

    // Clear the preserved content map after restoration
    this._preservedContent.clear();

    return result;
  }

  /**
   * Handle unusual HTML structures that aren't well-supported by standard Markdown converters
   *
   * @param html HTML content to process
   * @returns Processed HTML with unusual structures pre-processed
   */
  private handleUnusualStructures(html: string): string {
    if (!html) {
      return '';
    }

    try {
      // Create temporary container
      const container = document.createElement('div');
      container.innerHTML = html;

      // Process definition lists (dl, dt, dd)
      const definitionLists = container.querySelectorAll('dl');
      definitionLists.forEach(dl => {
        const terms = dl.querySelectorAll('dt');
        const fragment = document.createDocumentFragment();

        terms.forEach(term => {
          // Get description(s) that follow this term
          let desc = term.nextElementSibling;
          while (desc && desc.tagName.toLowerCase() === 'dd') {
            // Create bold term
            const boldTerm = document.createElement('strong');
            boldTerm.textContent = term.textContent || '';

            // Create paragraph for the term-description pair
            const paragraph = document.createElement('p');
            paragraph.appendChild(boldTerm);
            paragraph.appendChild(document.createTextNode(': '));

            // Clone the description content
            while (desc.firstChild) {
              paragraph.appendChild(desc.firstChild.cloneNode(true));
            }

            // Add to the fragment
            fragment.appendChild(paragraph);

            // Move to next sibling
            const nextDesc = desc.nextElementSibling;
            desc.parentNode?.removeChild(desc);
            desc = nextDesc;
          }

          // Remove the original dt
          term.parentNode?.removeChild(term);
        });

        // Replace the dl with the new structure
        dl.parentNode?.insertBefore(fragment, dl);
        dl.parentNode?.removeChild(dl);
      });

      // Process details/summary elements
      const detailsElements = container.querySelectorAll('details');
      detailsElements.forEach(details => {
        // Create a blockquote to represent the details/summary
        const blockquote = document.createElement('blockquote');

        // Get the summary
        const summary = details.querySelector('summary');
        const title = summary?.textContent || 'Details';

        // Create a strong element for the title
        const strongTitle = document.createElement('strong');
        strongTitle.textContent = title;

        // Add title to blockquote
        blockquote.appendChild(strongTitle);
        blockquote.appendChild(document.createElement('br'));

        // Move all other content from details to blockquote
        while (details.firstChild) {
          if (details.firstChild !== summary) {
            blockquote.appendChild(details.firstChild);
          } else {
            details.removeChild(details.firstChild);
          }
        }

        // Replace details with blockquote
        details.parentNode?.replaceChild(blockquote, details);
      });

      // Process figure/figcaption elements
      const figures = container.querySelectorAll('figure');
      figures.forEach(figure => {
        const figCaption = figure.querySelector('figcaption');
        const img = figure.querySelector('img');

        if (img && figCaption) {
          // Add the figcaption text as alt text to the image if not already present
          if (!img.alt || img.alt.trim() === '') {
            img.alt = figCaption.textContent || '';
          }

          // Create a wrapper paragraph for the image and caption
          const wrapper = document.createElement('p');

          // Clone the image
          wrapper.appendChild(img.cloneNode(true));
          wrapper.appendChild(document.createElement('br'));

          // Add caption as italic text
          const caption = document.createElement('em');
          caption.textContent = figCaption.textContent || '';
          wrapper.appendChild(caption);

          // Replace figure with our wrapper
          figure.parentNode?.replaceChild(wrapper, figure);
        }
      });

      // Process complex nested lists
      // Find incorrectly nested lists
      const directListItems = container.querySelectorAll('body > li, div > li, p > li');
      directListItems.forEach(li => {
        // Create a parent list for orphaned list items
        const parentList = document.createElement(
          li.classList.contains('ol-item') ? 'ol' : 'ul'
        );

        // Move the list item to the proper parent
        li.parentNode?.insertBefore(parentList, li);
        parentList.appendChild(li);
      });

      // Fix nested lists with inconsistent indentation
      const nestedLists = container.querySelectorAll('li > ul, li > ol');
      nestedLists.forEach(nestedList => {
        // Ensure the nested list is a proper child of the list item
        const parent = nestedList.parentElement;
        if (parent) {
          // Move any text after the nested list back to the parent list item
          const fragment = document.createDocumentFragment();
          let nextSibling = nestedList.nextSibling;

          while (nextSibling) {
            const currentSibling = nextSibling;
            nextSibling = nextSibling.nextSibling;
            fragment.appendChild(currentSibling);
          }

          if (fragment.childNodes.length > 0) {
            // Create a wrapper span
            const wrapper = document.createElement('span');
            wrapper.appendChild(fragment);
            parent.appendChild(wrapper);
          }
        }
      });

      // Process blockquotes with citations
      const blockquotes = container.querySelectorAll('blockquote');
      blockquotes.forEach(blockquote => {
        const cites = blockquote.querySelectorAll('cite');
        if (cites.length > 0) {
          // Add each citation as an em element at the end of the blockquote
          cites.forEach(cite => {
            const em = document.createElement('em');
            em.textContent = `— ${cite.textContent || ''}`;

            // Add line break and citation
            blockquote.appendChild(document.createElement('br'));
            blockquote.appendChild(em);

            // Remove original cite
            cite.parentNode?.removeChild(cite);
          });
        }
      });

      // Process iframes and embedded content
      const iframes = container.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        const src = iframe.getAttribute('src') || '';
        if (src) {
          // Create a wrapper for the iframe
          const wrapper = document.createElement('div');
          wrapper.className = 'embedded-content';

          // Create paragraph with link to the source
          const p = document.createElement('p');
          p.innerHTML = `<strong>Embedded content:</strong> <a href="${src}">${src}</a>`;

          // Add a description if available
          const title = iframe.getAttribute('title');
          if (title) {
            const description = document.createElement('p');
            description.innerHTML = `<em>${title}</em>`;
            wrapper.appendChild(description);
          }

          // Add paragraph with link
          wrapper.appendChild(p);

          // Replace iframe with our wrapper
          iframe.parentNode?.replaceChild(wrapper, iframe);
        }
      });

      // Process video elements
      const videos = container.querySelectorAll('video');
      videos.forEach(video => {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-content';

        // Get the poster image or source
        const poster = video.getAttribute('poster');
        const sources = video.querySelectorAll('source');
        let sourceUrl = '';

        // Try to find a source
        if (sources.length > 0) {
          const source = sources[0];
          sourceUrl = source.getAttribute('src') || '';
        }

        // Create content for the wrapper
        if (poster) {
          // If there's a poster, use it as an image
          wrapper.innerHTML = `<p><img src="${poster}" alt="Video thumbnail"></p>`;
        }

        // Add link to the video source
        if (sourceUrl) {
          const link = document.createElement('p');
          link.innerHTML = `<strong>Video:</strong> <a href="${sourceUrl}">${sourceUrl}</a>`;
          wrapper.appendChild(link);
        }

        // Replace video with our wrapper
        video.parentNode?.replaceChild(wrapper, video);
      });

      // Process audio elements
      const audios = container.querySelectorAll('audio');
      audios.forEach(audio => {
        const wrapper = document.createElement('div');
        wrapper.className = 'audio-content';

        // Get sources
        const sources = audio.querySelectorAll('source');
        let sourceUrl = '';

        // Try to find a source
        if (sources.length > 0) {
          const source = sources[0];
          sourceUrl = source.getAttribute('src') || '';
        }

        // Add link to the audio source
        if (sourceUrl) {
          wrapper.innerHTML = `<p><strong>Audio:</strong> <a href="${sourceUrl}">${sourceUrl}</a></p>`;
        } else {
          wrapper.innerHTML = '<p><em>Audio content (source not available)</em></p>';
        }

        // Replace audio with our wrapper
        audio.parentNode?.replaceChild(wrapper, audio);
      });

      return container.innerHTML;
    } catch (error) {
      logError(
        ErrorCategory.MARKDOWN_CONVERSION,
        'Failed to process unusual HTML structures',
        error instanceof Error ? error : new Error(String(error))
      );

      return html;
    }
  }

  /**
   * Convert HTML content to Markdown
   *
   * @param html HTML content to convert
   * @returns Converted Markdown content
   */
  public convertToMarkdown(html: string): string {
    try {
      if (!html || html.trim() === '') {
        return '';
      }

      // Extract front matter if enabled
      const { html: processedHtml, frontMatter } = this.extractFrontMatter(html);

      // Preserve special content
      this._preservedContent = new Map();
      const htmlWithPreservedContent = this.preserveSpecialContent(processedHtml);

      // Process unusual HTML structures
      const htmlWithProcessedStructures = this.handleUnusualStructures(htmlWithPreservedContent);

      // Pre-process HTML if complex structure processing is enabled
      let htmlToConvert = htmlWithProcessedStructures;
      if (this.options.processComplexStructures) {
        htmlToConvert = this.preProcessComplexStructures(htmlWithProcessedStructures);
      }

      // Convert to markdown using Turndown
      const markdown = this.turndownService.turndown(htmlToConvert);

      // Restore special content
      const markdownWithRestoredContent = this.restoreSpecialContent(markdown);

      // Apply post-processing
      const cleanedMarkdown = this.postProcessMarkdown(markdownWithRestoredContent);

      // Add front matter if it was extracted
      if (frontMatter) {
        return `---\n${frontMatter}\n---\n\n${cleanedMarkdown}`;
      }

      return cleanedMarkdown;
    } catch (error) {
      logError(
        ErrorCategory.MARKDOWN_CONVERSION,
        'Failed to convert HTML to Markdown',
        error instanceof Error ? error : new Error(String(error))
      );

      // Return original HTML as fallback
      return `<!-- Markdown conversion failed -->\n\n${html}`;
    }
  }

  /**
   * Pre-process HTML to handle complex structures before conversion
   *
   * @param html HTML content to process
   * @returns Processed HTML content
   */
  private preProcessComplexStructures(html: string): string {
    try {
      // Create a temporary container to parse the HTML
      const container = document.createElement('div');
      container.innerHTML = html;

      // Process tables
      const tables = container.querySelectorAll('table');
      tables.forEach(table => {
        const processedTable = processTable(table as HTMLTableElement, this.options.tableOptions);
        table.parentNode?.replaceChild(processedTable, table);
      });

      // Process nested lists
      const lists = container.querySelectorAll('ul, ol');
      lists.forEach(list => {
        // Only process top-level lists
        if (!list.parentElement?.closest('ul, ol')) {
          const processedList = processNestedList(list as HTMLElement);
          list.parentNode?.replaceChild(processedList, list);
        }
      });

      // Process definition lists
      const definitionLists = container.querySelectorAll('dl');
      definitionLists.forEach(dl => {
        const processedDl = processDefinitionList(dl as HTMLDListElement);
        dl.parentNode?.replaceChild(processedDl, dl);
      });

      // Process blockquotes
      const blockquotes = container.querySelectorAll('blockquote');
      blockquotes.forEach(bq => {
        // Only process top-level blockquotes
        if (!bq.parentElement?.closest('blockquote')) {
          const processedBq = processBlockquote(bq as HTMLQuoteElement);
          bq.parentNode?.replaceChild(processedBq, bq);
        }
      });

      // Return the processed HTML
      return container.innerHTML;
    } catch (error) {
      logError(
        ErrorCategory.MARKDOWN_CONVERSION,
        'Failed to pre-process complex structures',
        error instanceof Error ? error : new Error(String(error))
      );

      // Return the original HTML if processing fails
      return html;
    }
  }

  /**
   * Configure rules for the Turndown service
   * This sets up both basic and extended rules
   */
  private configureRules(): void {
    // Apply basic rules
    this.configureBasicRules();

    // Apply advanced custom rules from separate module
    configureCustomRules(this.turndownService);
  }

  /**
   * Configure basic rules for Turndown
   * These are simple rules that don't need complex handling
   */
  private configureBasicRules(): void {
    // Preserve line breaks
    this.turndownService.addRule('lineBreaks', {
      filter: ['br'],
      replacement: () => '  \n',
    });

    // Handle figures and captions
    this.turndownService.addRule('figures', {
      filter: ['figure'],
      replacement: (content: string) => {
        return `\n\n${content.trim()}\n\n`;
      },
    });

    // Handle figure captions
    this.turndownService.addRule('figcaptions', {
      filter: ['figcaption'],
      replacement: (content: string) => {
        return `\n*${content.trim()}*\n`;
      },
    });

    // Handle images with dimensions
    if (this.options.preserveImageSize) {
      this.turndownService.addRule('images', {
        filter: ['img'],
        replacement: (content: string, node) => {
          const imgElement = node as HTMLImageElement;
          const alt = imgElement.getAttribute('alt') || '';
          const src = imgElement.getAttribute('src') || '';
          const title = imgElement.getAttribute('title');
          const width = imgElement.getAttribute('width');
          const height = imgElement.getAttribute('height');

          let dimensions = '';
          if (width || height) {
            dimensions = ` =${width || ''}x${height || ''}`;
          }

          const titlePart = title ? ` "${title}"` : '';
          return src ? `![${alt}](${src}${titlePart}${dimensions})` : '';
        },
      });
    }

    // Preserve HTML in code blocks
    this.turndownService.addRule('codeBlocks', {
      filter: ['pre'],
      replacement: (content: string, node) => {
        const preElement = node as HTMLPreElement;
        const code = preElement.querySelector('code');
        const language = code?.className?.replace(/^language-/, '') || '';
        const codeContent = code?.textContent || preElement.textContent || '';

        return `\n\n${this.options.fence}${language}\n${codeContent}\n${this.options.fence}\n\n`;
      },
    });

    // Use data-align attribute for table cell alignment
    if (this.options.preserveTableAlignment) {
      this.turndownService.addRule('tableAlignedCell', {
        filter: (node) => {
          return (
            ['th', 'td'].includes(node.nodeName.toLowerCase()) &&
            node.hasAttribute('data-align')
          );
        },
        replacement: (content, node) => {
          const align = (node as HTMLElement).getAttribute('data-align');
          let prefix = ' ';
          let suffix = ' |';

          if (align === 'center') {
            prefix = ' :';
            suffix = ': |';
          } else if (align === 'right') {
            prefix = ' ';
            suffix = ': |';
          } else if (align === 'left') {
            prefix = ' :';
            suffix = ' |';
          }

          return prefix + content.trim() + suffix;
        }
      });
    }
  }

  /**
   * Post-process markdown to clean up and fix common issues
   *
   * @param markdown Raw markdown to process
   * @returns Cleaned up markdown
   */
  private postProcessMarkdown(markdown: string): string {
    if (!markdown) {
      return '';
    }

    return markdown
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove more than 2 consecutive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Fix list item spacing
      .replace(/\n\s*[-*+]\s/g, '\n- ')
      // Ensure code blocks have proper spacing
      .replace(/(\n```[^\n]*\n)(.*?)(\n```\s*)/g, '\n$1$2$3\n')
      // Fix heading spacing
      .replace(/\n(#{1,6})\s*([^\n]+)/g, '\n$1 $2')
      // Trim trailing whitespace on lines
      .replace(/[ \t]+$/gm, '')
      // Improve table formatting
      .replace(/\|[ \t]+/g, '| ')
      .replace(/[ \t]+\|/g, ' |')
      // Fix indentation in nested lists
      .replace(/\n\s{2,}[-*+]\s/g, match => {
        // Calculate correct indentation
        const indent = Math.floor((match.length - 3) / 2) * 2;
        return `\n${' '.repeat(indent)}- `;
      })
      // Fix blockquote formatting
      .replace(/\n>\s*\n>/g, '\n>\n>')
      // Ensure proper spacing around horizontal rules
      .replace(/\n([-*_]{3,})\n/g, '\n\n$1\n\n')
      // Fix consecutive headings without content between them
      .replace(/(\n#{1,6} [^\n]+\n)(?=#{1,6} [^\n]+)/g, '$1\n')
      // Improve link formatting by removing unnecessary spaces inside link text
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        return `[${text.trim()}](${url.trim()})`;
      })
      // Fix excessive whitespace inside inline code
      .replace(/`\s+([^`]+)\s+`/g, '`$1`')
      // Fix ordered list numbering (ensure proper sequence)
      .replace(/\n\s*\d+\.\s+/g, (match, offset, string) => {
        // Check if this is the start of a new list or continuation
        const prevLine = string.substring(0, offset).split('\n').pop() || '';
        const isNewList = !prevLine.match(/\d+\.\s+/);
        const number = isNewList ? 1 : parseInt(prevLine.match(/(\d+)\.\s+/)?.[1] || '0') + 1;
        return `\n${number}. `;
      })
      // Make code block language identifiers consistent (lowercase)
      .replace(/```([a-zA-Z0-9]+)/g, (match, lang) => {
        return `\`\`\`${lang.toLowerCase()}`;
      })
      // Fix spacing around emphasis and strong emphasis
      .replace(/(\S)(\*\*|\*|__|_)(\S)/g, '$1 $2$3')
      .replace(/(\S)(\*\*|\*|__|_)(\s)/g, '$1 $2$3')
      .replace(/(\s)(\*\*|\*|__|_)(\S)/g, '$1$2 $3')
      // Ensure image alt text is properly formatted
      .replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        return `![${alt.trim()}](${src.trim()})`;
      })
      // Fix bullet list consistency (standardize to "-")
      .replace(/\n\s*[*+]\s+/g, '\n- ')
      // Ensure blank line before and after code blocks
      .replace(/([^\n])\n```/g, '$1\n\n```')
      .replace(/```\n([^\n])/g, '```\n\n$1')
      // Trim leading/trailing whitespace of full content
      .trim();
  }

  /**
   * Get the current Turndown service instance
   * Useful for applying additional rules or modifications
   *
   * @returns Turndown service instance
   */
  public getTurndownService(): TurndownService {
    return this.turndownService;
  }
}

/**
 * Create a markdown conversion service with default options
 * Convenience function for one-off conversions
 *
 * @returns Configured markdown conversion service
 */
export function createMarkdownConverter(): MarkdownConversionService {
  return new MarkdownConversionService();
}

/**
 * Convert HTML to Markdown using default options
 * Convenience function for quick conversions
 *
 * @param html HTML content to convert
 * @returns Converted Markdown content
 */
export function convertHtmlToMarkdown(html: string): string {
  const converter = createMarkdownConverter();
  return converter.convertToMarkdown(html);
}