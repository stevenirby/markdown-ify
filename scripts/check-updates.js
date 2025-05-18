#!/usr/bin/env node

/**
 * A simple script to check for outdated dependencies
 * Run with: node scripts/check-updates.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Header
console.log(`${colors.bright}${colors.cyan}====================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}  Markdown-ify Dependency Check${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}====================================${colors.reset}\n`);

try {
  // Run npm outdated and capture the output
  console.log(`${colors.bright}Checking for outdated dependencies...${colors.reset}\n`);
  const outdatedOutput = execSync('npm outdated --json', { encoding: 'utf8' });

  if (outdatedOutput.trim() === '') {
    console.log(`${colors.green}✓ All dependencies are up to date!${colors.reset}\n`);
  } else {
    // Parse the JSON output
    const outdatedDeps = JSON.parse(outdatedOutput);
    const depCount = Object.keys(outdatedDeps).length;

    console.log(`${colors.yellow}Found ${depCount} outdated dependencies:${colors.reset}\n`);

    // Display them in a table-like format
    console.log(`${colors.bright}Package${' '.repeat(25)}Current${' '.repeat(10)}Latest${' '.repeat(10)}Type${colors.reset}`);
    console.log('-'.repeat(80));

    for (const [name, info] of Object.entries(outdatedDeps)) {
      const packageName = name.length > 30 ? name.substring(0, 27) + '...' : name;
      const current = info.current || 'Not installed';
      const latest = info.latest;
      const type = info.type || '-';

      console.log(
        `${packageName}${' '.repeat(Math.max(2, 32 - packageName.length))}` +
        `${current}${' '.repeat(Math.max(2, 17 - String(current).length))}` +
        `${latest}${' '.repeat(Math.max(2, 17 - String(latest).length))}` +
        `${type}`
      );
    }

    console.log('\n');
    console.log(`${colors.cyan}Run 'npm update' to update to the compatible versions.${colors.reset}`);
    console.log(`${colors.cyan}Run 'npm install <package>@latest' to update a specific package to the latest version.${colors.reset}\n`);
  }

  // Security audit
  console.log(`${colors.bright}Running security audit...${colors.reset}\n`);
  const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
  const auditResults = JSON.parse(auditOutput);

  if (auditResults.vulnerabilities && Object.keys(auditResults.vulnerabilities).length > 0) {
    const vulnerabilityCount = auditResults.metadata.vulnerabilities.total;
    console.log(`${colors.red}Found ${vulnerabilityCount} security ${vulnerabilityCount === 1 ? 'vulnerability' : 'vulnerabilities'}!${colors.reset}\n`);
    console.log(`${colors.cyan}Run 'npm audit fix' to attempt to fix automatically.${colors.reset}`);
    console.log(`${colors.cyan}Run 'npm audit' for more details.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✓ No security vulnerabilities found!${colors.reset}\n`);
  }

} catch (error) {
  console.error(`${colors.red}Error checking dependencies:${colors.reset}`, error.message);
  process.exit(1);
}

console.log(`${colors.bright}${colors.cyan}====================================${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}  Dependency check completed${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}====================================${colors.reset}\n`);