/**
 * Network utility functions for extracting client information from requests
 */

/**
 * Extract the client IP address from request headers
 * 
 * Handles the x-forwarded-for header which can contain a comma-separated list
 * of IP addresses when there are multiple proxies. Returns only the first IP
 * (the original client IP) rather than the entire proxy chain.
 * 
 * @param xForwardedFor - Value from x-forwarded-for header
 * @param xRealIp - Value from x-real-ip header
 * @param fallback - Fallback IP if neither header is present (default: '0.0.0.0')
 * @returns The extracted client IP address
 */
export function extractClientIp(
  xForwardedFor: string | undefined,
  xRealIp: string | undefined,
  fallback: string = '0.0.0.0'
): string {
  // x-forwarded-for can contain multiple IPs (client, proxy1, proxy2, ...)
  // Extract only the first IP which is the original client IP
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }
  
  // Fall back to x-real-ip or default
  return xRealIp || fallback;
}
