/**
 * Utility functions for version comparison and sorting
 */

/**
 * Parses a semantic version string into comparable parts
 * Handles versions like "1.24.0", "2.1.0-beta", "main", "pr-360"
 * 
 * @param version - Version string to parse
 * @returns Object with major, minor, patch numbers and original string
 */
export function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
  original: string;
} {
  // Handle non-semver versions (like "main", "pr-360", etc.)
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(.*)$/;
  const match = version.match(semverRegex);

  if (!match) {
    // Non-semver versions get lowest priority
    return {
      major: -1,
      minor: -1,
      patch: -1,
      prerelease: version,
      original: version
    };
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || '',
    original: version
  };
}

/**
 * Compares two semantic version strings
 * 
 * @param a - First version string
 * @param b - Second version string
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  // Compare major version
  if (versionA.major !== versionB.major) {
    return versionA.major - versionB.major;
  }

  // Compare minor version
  if (versionA.minor !== versionB.minor) {
    return versionA.minor - versionB.minor;
  }

  // Compare patch version
  if (versionA.patch !== versionB.patch) {
    return versionA.patch - versionB.patch;
  }

  // If base versions are equal, versions without prerelease are greater
  if (versionA.prerelease === '' && versionB.prerelease !== '') {
    return 1;
  }
  if (versionA.prerelease !== '' && versionB.prerelease === '') {
    return -1;
  }

  // Compare prerelease strings lexicographically
  return versionA.prerelease.localeCompare(versionB.prerelease);
}

/**
 * Finds the latest (highest) semantic version from an array of version strings
 * 
 * @param versions - Array of version strings
 * @returns Latest version string, or null if array is empty
 */
export function findLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) {
    return null;
  }

  return versions.reduce((latest, current) => {
    return compareVersions(current, latest) > 0 ? current : latest;
  });
}

/**
 * Sorts an array of version strings in descending order (latest first)
 * 
 * @param versions - Array of version strings to sort
 * @returns Sorted array (does not mutate original)
 */
export function sortVersionsDescending(versions: string[]): string[] {
  return [...versions].sort((a, b) => compareVersions(b, a));
}
