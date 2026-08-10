export type GeographyLayer = 'active' | 'new-30d' | 'all-time';

export interface CountryCount {
	countryCode: string;
	count: number;
}

export interface GeographyLayerData {
	countries: CountryCount[];
	totalCount: number;
	description: string;
}

const LAYER_DESCRIPTIONS: Record<GeographyLayer, string> = {
	active: 'Active installations — heartbeat within last 3 days',
	'new-30d': 'New installations — registered in the last 30 days',
	'all-time': 'All installations — every registration regardless of activity'
};

export function getGeographyLayerData(
	layer: GeographyLayer,
	activeCountries: CountryCount[],
	allTimeCountries: CountryCount[],
	newCountries: CountryCount[]
): GeographyLayerData {
	switch (layer) {
		case 'active':
			return {
				countries: activeCountries,
				totalCount: activeCountries.reduce((sum, c) => sum + c.count, 0),
				description: LAYER_DESCRIPTIONS.active
			};
		case 'new-30d':
			return {
				countries: newCountries,
				totalCount: newCountries.reduce((sum, c) => sum + c.count, 0),
				description: LAYER_DESCRIPTIONS['new-30d']
			};
		case 'all-time':
			return {
				countries: allTimeCountries,
				totalCount: allTimeCountries.reduce((sum, c) => sum + c.count, 0),
				description: LAYER_DESCRIPTIONS['all-time']
			};
	}
}

export function sortCountriesDescending(countries: CountryCount[]): CountryCount[] {
	return [...countries].sort((a, b) => b.count - a.count);
}

export function getTopCountries(countries: CountryCount[], limit: number = 10): CountryCount[] {
	return sortCountriesDescending(countries).slice(0, limit);
}
