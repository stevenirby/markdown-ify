/**
 * Resource Loader
 * Utility for dynamically loading external resources like scripts and stylesheets
 */

// Type definitions for resources
export interface Resource {
  id: string;
  loaded: boolean;
  error?: Error;
}

export interface ScriptResource extends Resource {
  type: 'script';
  src: string;
  async?: boolean;
  defer?: boolean;
  integrity?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

export interface StyleResource extends Resource {
  type: 'style';
  href: string;
  integrity?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

// Resource registry to track loaded resources
type ResourceRegistry = Map<string, Resource>;
const registry: ResourceRegistry = new Map();

/**
 * Load a JavaScript file dynamically
 *
 * @param resource Script resource definition
 * @returns Promise that resolves when the script is loaded
 */
export function loadScript(resource: ScriptResource): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (registry.has(resource.id)) {
      const registeredResource = registry.get(resource.id)!;
      if (registeredResource.loaded) {
        return resolve();
      } else if (registeredResource.error) {
        return reject(registeredResource.error);
      }
    }

    // Create script element
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = resource.src;
    script.id = `markdownify-script-${resource.id}`;

    // Add optional attributes
    if (resource.async !== undefined) script.async = resource.async;
    if (resource.defer !== undefined) script.defer = resource.defer;
    if (resource.integrity) script.integrity = resource.integrity;
    if (resource.crossOrigin) script.crossOrigin = resource.crossOrigin;

    // Register in our tracker
    registry.set(resource.id, { ...resource, loaded: false });

    // Add event listeners
    script.onload = () => {
      registry.set(resource.id, { ...resource, loaded: true });
      resolve();
    };

    script.onerror = (_event) => {
      const error = new Error(`Failed to load script: ${resource.src}`);
      registry.set(resource.id, { ...resource, loaded: false, error });
      reject(error);
    };

    // Add to document
    document.head.appendChild(script);
  });
}

/**
 * Load a CSS stylesheet dynamically
 *
 * @param resource Style resource definition
 * @returns Promise that resolves when the stylesheet is loaded
 */
export function loadStyle(resource: StyleResource): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (registry.has(resource.id)) {
      const registeredResource = registry.get(resource.id)!;
      if (registeredResource.loaded) {
        return resolve();
      } else if (registeredResource.error) {
        return reject(registeredResource.error);
      }
    }

    // Create link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = resource.href;
    link.id = `markdownify-style-${resource.id}`;

    // Add optional attributes
    if (resource.integrity) link.integrity = resource.integrity;
    if (resource.crossOrigin) link.crossOrigin = resource.crossOrigin;

    // Register in our tracker
    registry.set(resource.id, { ...resource, loaded: false });

    // Add event listeners
    link.onload = () => {
      registry.set(resource.id, { ...resource, loaded: true });
      resolve();
    };

    link.onerror = (_event) => {
      const error = new Error(`Failed to load stylesheet: ${resource.href}`);
      registry.set(resource.id, { ...resource, loaded: false, error });
      reject(error);
    };

    // Add to document
    document.head.appendChild(link);
  });
}

/**
 * Check if a resource is already loaded
 *
 * @param id Resource identifier
 * @returns Boolean indicating if the resource is loaded
 */
export function isResourceLoaded(id: string): boolean {
  const resource = registry.get(id);
  return resource ? resource.loaded : false;
}

/**
 * Load multiple resources in parallel
 *
 * @param resources Array of resources to load
 * @returns Promise that resolves when all resources are loaded
 */
export function loadResources(resources: (ScriptResource | StyleResource)[]): Promise<void> {
  const promises = resources.map(resource => {
    return resource.type === 'script'
      ? loadScript(resource as ScriptResource)
      : loadStyle(resource as StyleResource);
  });

  return Promise.all(promises).then(() => {
    console.warn(`✅ Loaded ${resources.length} resources successfully`);
  });
}

/**
 * Clean up all loaded resources
 */
export function unloadResources(): void {
  // Remove script tags
  document.querySelectorAll('[id^="markdownify-script-"]').forEach(el => {
    el.parentNode?.removeChild(el);
  });

  // Remove style tags
  document.querySelectorAll('[id^="markdownify-style-"]').forEach(el => {
    el.parentNode?.removeChild(el);
  });

  // Clear registry
  registry.clear();

  console.warn('🧹 Unloaded all Markdown-ify resources');
}