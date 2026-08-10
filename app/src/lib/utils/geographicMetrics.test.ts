import { describe, it, expect } from 'vitest';
import {
	getGeographyLayerData,
	sortCountriesDescending,
	getTopCountries,
	type CountryCount
} from './geographicMetrics';

const activeCountries: CountryCount[] = [
	{ countryCode: 'US', count: 73 },
	{ countryCode: 'DE', count: 45 },
	{ countryCode: 'GB', count: 30 }
];

const allTimeCountries: CountryCount[] = [
	{ countryCode: 'JP', count: 400 },
	{ countryCode: 'US', count: 350 },
	{ countryCode: 'RU', count: 300 }
];

const newCountries: CountryCount[] = [
	{ countryCode: 'JP', count: 200 },
	{ countryCode: 'RU', count: 180 },
	{ countryCode: 'US', count: 150 }
];

describe('getGeographyLayerData', () => {
	it('returns active countries for active layer', () => {
		const result = getGeographyLayerData('active', activeCountries, allTimeCountries, newCountries);
		expect(result.countries).toEqual(activeCountries);
		expect(result.totalCount).toBe(148);
		expect(result.description).toContain('Active');
	});

	it('returns new countries for new-30d layer', () => {
		const result = getGeographyLayerData(
			'new-30d',
			activeCountries,
			allTimeCountries,
			newCountries
		);
		expect(result.countries).toEqual(newCountries);
		expect(result.totalCount).toBe(530);
		expect(result.description).toContain('30 days');
	});

	it('returns all-time countries for all-time layer', () => {
		const result = getGeographyLayerData(
			'all-time',
			activeCountries,
			allTimeCountries,
			newCountries
		);
		expect(result.countries).toEqual(allTimeCountries);
		expect(result.totalCount).toBe(1050);
		expect(result.description).toContain('All installations');
	});

	it('handles empty arrays', () => {
		const result = getGeographyLayerData('active', [], [], []);
		expect(result.countries).toEqual([]);
		expect(result.totalCount).toBe(0);
	});
});

describe('sortCountriesDescending', () => {
	it('sorts by count descending', () => {
		const unsorted: CountryCount[] = [
			{ countryCode: 'GB', count: 10 },
			{ countryCode: 'US', count: 50 },
			{ countryCode: 'DE', count: 30 }
		];
		const sorted = sortCountriesDescending(unsorted);
		expect(sorted.map((c) => c.countryCode)).toEqual(['US', 'DE', 'GB']);
	});

	it('does not mutate the original array', () => {
		const original: CountryCount[] = [
			{ countryCode: 'GB', count: 10 },
			{ countryCode: 'US', count: 50 }
		];
		sortCountriesDescending(original);
		expect(original[0].countryCode).toBe('GB');
	});
});

describe('getTopCountries', () => {
	it('returns top N countries sorted descending', () => {
		const countries: CountryCount[] = [
			{ countryCode: 'US', count: 100 },
			{ countryCode: 'DE', count: 80 },
			{ countryCode: 'GB', count: 60 },
			{ countryCode: 'FR', count: 40 }
		];
		const top2 = getTopCountries(countries, 2);
		expect(top2).toHaveLength(2);
		expect(top2[0].countryCode).toBe('US');
		expect(top2[1].countryCode).toBe('DE');
	});

	it('defaults to 10', () => {
		const countries: CountryCount[] = Array.from({ length: 15 }, (_, i) => ({
			countryCode: String(i).padStart(2, '0'),
			count: 15 - i
		}));
		expect(getTopCountries(countries)).toHaveLength(10);
	});
});
