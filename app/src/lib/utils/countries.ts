/**
 * Country code to country name mapping
 * ISO 3166-1 alpha-2 codes
 */
export const COUNTRY_NAMES: Record<string, string> = {
	US: 'United States',
	GB: 'United Kingdom',
	DE: 'Germany',
	FR: 'France',
	CA: 'Canada',
	AU: 'Australia',
	NL: 'Netherlands',
	SE: 'Sweden',
	NO: 'Norway',
	DK: 'Denmark',
	FI: 'Finland',
	BE: 'Belgium',
	CH: 'Switzerland',
	AT: 'Austria',
	ES: 'Spain',
	IT: 'Italy',
	PL: 'Poland',
	RU: 'Russia',
	BR: 'Brazil',
	IN: 'India',
	CN: 'China',
	JP: 'Japan',
	KR: 'South Korea',
	SG: 'Singapore',
	NZ: 'New Zealand',
	IE: 'Ireland',
	PT: 'Portugal',
	GR: 'Greece',
	CZ: 'Czech Republic',
	RO: 'Romania',
	HU: 'Hungary'
};

/**
 * Get country name from ISO 3166-1 alpha-2 country code
 * @param code - Two-letter country code (e.g., 'US', 'GB'), or null for unknown
 * @returns Full country name or 'Unknown' if code is null, or the code itself if not found
 */
export function getCountryName(code: string | null): string {
	if (!code) return 'Unknown';
	return COUNTRY_NAMES[code] || code;
}
