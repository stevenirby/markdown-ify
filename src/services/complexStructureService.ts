/**
 * Complex Structure Service
 * Handles processing of complex HTML structures like tables, nested lists, etc.
 */

import { ErrorCategory, logError } from '../utils/errorHandler';

// Interface for table configuration
export interface TableOptions {
  alignCells?: boolean;
  minColumnWidth?: number;
  maxColumnWidth?: number;
  preserveTableClasses?: boolean;
}

// Default table options
export const DEFAULT_TABLE_OPTIONS: TableOptions = {
  alignCells: true,
  minColumnWidth: 5,
  maxColumnWidth: 50,
  preserveTableClasses: true,
};

/**
 * Process and optimize HTML tables before conversion to markdown
 * This helps create better-structured markdown tables
 *
 * @param tableElement Table element to process
 * @param options Table processing options
 * @returns Processed table element (clone)
 */
export function processTable(tableElement: HTMLTableElement, options: TableOptions = DEFAULT_TABLE_OPTIONS): HTMLTableElement {
  try {
    // Clone the table to avoid modifying the original
    const tableClone = tableElement.cloneNode(true) as HTMLTableElement;

    // Normalize the table structure (ensure it has thead, tbody)
    normalizeTableStructure(tableClone);

    // Process cell alignments if enabled
    if (options.alignCells) {
      processTableAlignments(tableClone);
    }

    // Remove unnecessary attributes unless preserving classes
    if (!options.preserveTableClasses) {
      cleanupTableAttributes(tableClone);
    }

    return tableClone;
  } catch (error) {
    logError(
      ErrorCategory.MARKDOWN_CONVERSION,
      'Failed to process complex table',
      error instanceof Error ? error : new Error(String(error))
    );

    // Return the original table element if processing fails
    return tableElement;
  }
}

/**
 * Ensure the table has proper structure with thead and tbody
 *
 * @param table Table element to normalize
 */
function normalizeTableStructure(table: HTMLTableElement): void {
  // Check if the table has a thead
  let thead = table.querySelector('thead');
  const rows = table.querySelectorAll('tr');

  if (!thead && rows.length > 0) {
    // Create a thead and move the first row into it
    thead = document.createElement('thead');
    const firstRow = rows[0];

    // Check if the first row has th elements
    const hasTh = firstRow.querySelector('th') !== null;

    // If first row has th elements, it's a header row
    if (hasTh) {
      // Move the first row to the thead
      thead.appendChild(firstRow);
      table.insertBefore(thead, table.firstChild);
    } else {
      // Convert first row td elements to th and move to thead
      const headerRow = firstRow.cloneNode(true) as HTMLTableRowElement;
      const headerCells = headerRow.querySelectorAll('td');

      headerCells.forEach(cell => {
        const th = document.createElement('th');
        th.innerHTML = cell.innerHTML;
        cell.parentNode?.replaceChild(th, cell);
      });

      thead.appendChild(headerRow);
      table.insertBefore(thead, table.firstChild);
    }
  }

  // Ensure tbody exists
  const tbody = table.querySelector('tbody');
  if (!tbody) {
    const newTbody = document.createElement('tbody');

    // Move all remaining rows (skip thead rows) to tbody
    Array.from(rows).forEach(row => {
      if (row.parentElement !== thead) {
        newTbody.appendChild(row);
      }
    });

    // Add tbody to the table
    table.appendChild(newTbody);
  }
}

/**
 * Process table cell alignments based on CSS or attributes
 *
 * @param table Table element to process
 */
function processTableAlignments(table: HTMLTableElement): void {
  // Get all cells (th and td)
  const cells = table.querySelectorAll('th, td');

  cells.forEach(cell => {
    // Try to get alignment from style
    const computedStyle = window.getComputedStyle(cell);
    const textAlign = computedStyle.textAlign;

    // Set data-align attribute for markdown conversion
    if (textAlign === 'center') {
      cell.setAttribute('data-align', 'center');
    } else if (textAlign === 'right') {
      cell.setAttribute('data-align', 'right');
    } else if (textAlign === 'left') {
      cell.setAttribute('data-align', 'left');
    }

    // Also check align attribute (HTML4 style)
    const alignAttr = cell.getAttribute('align');
    if (!cell.hasAttribute('data-align') && alignAttr) {
      cell.setAttribute('data-align', alignAttr);
    }
  });
}

/**
 * Clean up unnecessary attributes from table elements
 *
 * @param table Table element to clean
 */
function cleanupTableAttributes(table: HTMLTableElement): void {
  // Get all table elements
  const elements = table.querySelectorAll('*');

  elements.forEach(element => {
    // Remove all attributes except for necessary ones
    const attributes = Array.from(element.attributes);

    attributes.forEach(attr => {
      // Keep only these attributes
      if (!['data-align', 'rowspan', 'colspan'].includes(attr.name)) {
        element.removeAttribute(attr.name);
      }
    });
  });
}

/**
 * Process complex nested lists to ensure proper indentation in markdown
 *
 * @param listElement List element to process
 * @returns Processed list element (clone)
 */
export function processNestedList(listElement: HTMLElement): HTMLElement {
  try {
    // Clone the list to avoid modifying the original
    const listClone = listElement.cloneNode(true) as HTMLElement;

    // Apply special classes to indicate nesting level
    markNestedLevels(listClone);

    return listClone;
  } catch (error) {
    logError(
      ErrorCategory.MARKDOWN_CONVERSION,
      'Failed to process nested list',
      error instanceof Error ? error : new Error(String(error))
    );

    // Return the original list element if processing fails
    return listElement;
  }
}

/**
 * Mark nested levels in a list with data attributes
 *
 * @param listElement List element to mark
 * @param level Current nesting level (default: 0)
 */
function markNestedLevels(listElement: HTMLElement, level = 0): void {
  // Set the current level
  listElement.setAttribute('data-list-level', level.toString());

  // Process list items
  const items = listElement.querySelectorAll(':scope > li');

  items.forEach(item => {
    // Set the item level
    item.setAttribute('data-list-level', level.toString());

    // Process nested lists
    const nestedLists = item.querySelectorAll(':scope > ul, :scope > ol');

    nestedLists.forEach(nestedList => {
      markNestedLevels(nestedList as HTMLElement, level + 1);
    });
  });
}

/**
 * Process a definition list to ensure proper formatting in markdown
 *
 * @param dlElement Definition list element to process
 * @returns Processed definition list element (clone)
 */
export function processDefinitionList(dlElement: HTMLDListElement): HTMLDListElement {
  try {
    // Clone the list to avoid modifying the original
    const dlClone = dlElement.cloneNode(true) as HTMLDListElement;

    // Add special markers for definition terms and descriptions
    const terms = dlClone.querySelectorAll('dt');
    const descriptions = dlClone.querySelectorAll('dd');

    terms.forEach(term => {
      term.setAttribute('data-def-term', 'true');
    });

    descriptions.forEach(desc => {
      desc.setAttribute('data-def-desc', 'true');
    });

    return dlClone;
  } catch (error) {
    logError(
      ErrorCategory.MARKDOWN_CONVERSION,
      'Failed to process definition list',
      error instanceof Error ? error : new Error(String(error))
    );

    // Return the original list element if processing fails
    return dlElement;
  }
}

/**
 * Process a blockquote to ensure proper nesting in markdown
 *
 * @param blockquoteElement Blockquote element to process
 * @returns Processed blockquote element (clone)
 */
export function processBlockquote(blockquoteElement: HTMLQuoteElement): HTMLQuoteElement {
  try {
    // Clone the blockquote to avoid modifying the original
    const bqClone = blockquoteElement.cloneNode(true) as HTMLQuoteElement;

    // Process nested blockquotes
    markNestedBlockquotes(bqClone);

    return bqClone;
  } catch (error) {
    logError(
      ErrorCategory.MARKDOWN_CONVERSION,
      'Failed to process blockquote',
      error instanceof Error ? error : new Error(String(error))
    );

    // Return the original blockquote element if processing fails
    return blockquoteElement;
  }
}

/**
 * Mark nested blockquotes with data attributes
 *
 * @param blockquoteElement Blockquote element to mark
 * @param level Current nesting level (default: 0)
 */
function markNestedBlockquotes(blockquoteElement: HTMLElement, level = 0): void {
  // Set the current level
  blockquoteElement.setAttribute('data-quote-level', level.toString());

  // Process nested blockquotes
  const nestedQuotes = blockquoteElement.querySelectorAll(':scope > blockquote');

  nestedQuotes.forEach(quote => {
    markNestedBlockquotes(quote as HTMLElement, level + 1);
  });
}