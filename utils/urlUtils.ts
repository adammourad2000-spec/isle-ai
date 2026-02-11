/**
 * URL Utility Functions
 * Ensures all URLs are properly formatted with protocols
 */

/**
 * Normalize URL by adding https:// if missing
 * @param url - URL to normalize
 * @returns Properly formatted URL with protocol
 */
export function normalizeUrl(url: string | undefined | null): string {
  if (!url) return '';

  // Remove whitespace
  url = url.trim();

  // If already has protocol, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If starts with //, add https:
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  // If it looks like a relative path, don't modify
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return url;
  }

  // Otherwise, add https://
  return `https://${url}`;
}

/**
 * Normalize website URL - adds www. if domain is bare
 * @param url - URL to normalize
 * @returns Properly formatted URL
 */
export function normalizeWebsiteUrl(url: string | undefined | null): string {
  if (!url) return '';

  let normalized = normalizeUrl(url);

  // If it's a bare domain (no subdomain), add www.
  try {
    const urlObj = new URL(normalized);
    const hostname = urlObj.hostname;

    // Check if it's a bare domain (only domain.tld, no subdomain)
    const parts = hostname.split('.');
    if (parts.length === 2 && !hostname.startsWith('www.')) {
      urlObj.hostname = `www.${hostname}`;
      normalized = urlObj.toString();
    }
  } catch (e) {
    // If URL parsing fails, just return the normalized version
    console.warn('Failed to parse URL:', url, e);
  }

  return normalized;
}

/**
 * Validate if URL is accessible
 * @param url - URL to validate
 * @returns true if URL appears valid
 */
export function isValidUrl(url: string | undefined | null): boolean {
  if (!url) return false;

  try {
    const normalized = normalizeUrl(url);
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 * @param url - URL to extract domain from
 * @returns Domain name or empty string
 */
export function extractDomain(url: string | undefined | null): string {
  if (!url) return '';

  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Format URL for display (remove protocol, trailing slash)
 * @param url - URL to format
 * @returns User-friendly display version
 */
export function formatUrlForDisplay(url: string | undefined | null): string {
  if (!url) return '';

  let display = url.trim();

  // Remove protocol
  display = display.replace(/^https?:\/\//, '');

  // Remove trailing slash
  display = display.replace(/\/$/, '');

  // Remove www. if present
  display = display.replace(/^www\./, '');

  return display;
}

/**
 * Fix common URL typos and issues
 * @param url - URL to fix
 * @returns Fixed URL
 */
export function fixCommonUrlIssues(url: string | undefined | null): string {
  if (!url) return '';

  let fixed = url.trim();

  // Fix double slashes (except after protocol)
  fixed = fixed.replace(/([^:])\/\//g, '$1/');

  // Fix spaces
  fixed = fixed.replace(/\s+/g, '');

  // Fix common typos
  fixed = fixed.replace(/^htp:/, 'http:');
  fixed = fixed.replace(/^htps:/, 'https:');
  fixed = fixed.replace(/^http:\/([^\/])/, 'http://$1');
  fixed = fixed.replace(/^https:\/([^\/])/, 'https://$1');

  return normalizeUrl(fixed);
}

/**
 * Batch normalize URLs in an object
 * @param obj - Object containing URLs
 * @param urlFields - Array of field names that contain URLs
 * @returns Object with normalized URLs
 */
export function normalizeUrlsInObject<T extends Record<string, any>>(
  obj: T,
  urlFields: (keyof T)[]
): T {
  const normalized = { ...obj };

  urlFields.forEach(field => {
    if (typeof normalized[field] === 'string') {
      normalized[field] = normalizeWebsiteUrl(normalized[field] as string) as any;
    }
  });

  return normalized;
}
