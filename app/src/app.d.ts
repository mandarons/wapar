// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Locals {}
	// interface PageData {}
	// interface Error {}
	// interface Platform {}
}

declare module 'svgmap' {
	interface SVGMapOptions {
		targetElementID: string;
		data: {
			data: {
				[key: string]: {
					name: string;
					format: string;
					thousandSeparator?: string;
					thresholdMax?: number;
					thresholdMin?: number;
				};
			};
			applyData: string;
			values: {
				[key: string]: { [key: string]: number };
			};
		};
		colorMax?: string;
		colorMin?: string;
		colorNoData?: string;
		minZoom?: number;
		maxZoom?: number;
		zoomOnScroll?: boolean;
		mouseWheelZoomEnabled?: boolean;
		mouseWheelZoomWithKey?: boolean;
		mouseWheelZoomKeyMessage?: string;
		mouseWheelKeyMessageMac?: string;
		initialZoom?: number;
		initialPan?: { x: number; y: number };
		borderWidth?: number;
		borderColor?: string;
		hideFlag?: boolean;
		flagType?: string;
		flagSize?: number;
		noDataText?: string;
		touchSensitivity?: number;
		showContinentSelector?: boolean;
		zoomScaleSensitivity?: number;
		showZoomReset?: boolean;
		callback?: (id: string, value: number, element: HTMLElement) => void;
	}
	
	class svgMap {
		constructor(options: SVGMapOptions);
	}
	
	export default svgMap;
}
