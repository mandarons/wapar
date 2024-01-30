<script lang="ts">
	import { onMount } from 'svelte';
	import 'svgmap/dist/svgMap.min.css';
	export let data: {
		totalInstallations: number;
		monthlyActive: number;
		createdAt: string;
		countryToCount: { countryCode: string; count: number }[];
		iCloudDocker: { total: number };
		haBouncie: { total: number };
	};
	let mapObj: any = null;
	onMount(async () => {
		if (!mapObj) {
			const module = await import('svgmap');
			const svgMap = module.default;
			mapObj = new svgMap({
				targetElementID: 'svgMap',
				minZoom: 1,
				maxZoom: 3,
				initialZoom: 1,
				showContinentSelector: false,
				zoomScaleSensitivity: 1,
				showZoomReset: false,
				mouseWheelZoomEnabled: true,
				mouseWheelZoomWithKey: false,
				mouseWheelZoomKeyMessage: 'Not enabled',
				mouseWheelKeyMessageMac: 'Not enabled',
				flagType: 'emoji',
				noDataText: 'No installations detected',
				colorMax: '#050000',
				colorMin: '#ffb3b3',
				data: {
					data: {
						installations: {
							name: 'Installations',
							format: '{0}',
							thousandSeparator: ',',
							thresholdMax: 50000,
							thresholdMin: 0
						}
					},
					applyData: 'installations',
					values: Object.fromEntries(
						new Map(
							data.countryToCount.map(({ countryCode, count }) => [
								countryCode,
								{ installations: count }
							])
						)
					)
				}
			});
		}
	});
</script>

<section class="body-font text-gray-600">
	<div class="container mx-auto px-5 py-5">
		<div class="mb-5 flex w-full flex-col text-center">
			<h1 class="title-font mb-4 text-2xl font-medium text-gray-900 sm:text-3xl">
				Application Installations
			</h1>
		</div>
		<div class="-m-5 flex flex-wrap text-center">
			<div class="w-1/2 p-4 sm:w-1/4">
				<h2
					data-testid="total-installations"
					class="title-font text-3xl font-medium text-green-600 sm:text-4xl"
				>
					{data.totalInstallations}
				</h2>
				<p class="leading-relaxed">Total Installations</p>
			</div>
			<div class="w-1/2 p-4 sm:w-1/4">
				<h2
					data-testid="monthly-active"
					class="title-font text-3xl font-medium text-green-600 sm:text-4xl"
				>
					{data.monthlyActive}
				</h2>
				<p class="leading-relaxed">Monthly Active</p>
			</div>
			<div class="w-1/2 p-4 sm:w-1/4">
				<h2
					data-testid="icloud-drive-docker-total-installations"
					class="title-font text-3xl font-medium text-green-600 sm:text-4xl"
				>
					{data.iCloudDocker.total}
				</h2>
				<p class="leading-relaxed">iCloud Drive Docker</p>
			</div>
			<div class="w-1/2 p-4 sm:w-1/4">
				<h2
					data-testid="ha-bouncie-total-installations"
					class="title-font text-3xl font-medium text-green-600 sm:text-4xl"
				>
					{data.haBouncie.total}
				</h2>
				<p class="leading-relaxed">Home Assistant - Bouncie</p>
			</div>
		</div>
	</div>
</section>
<div class="container mx-auto flex flex-col items-center">
	<div id="svgMap" class="w-11/12 flex-col items-center justify-center"></div>
</div>
<div class="fixed bottom-0 w-full">
	<div class="flex items-center justify-between p-4">
		<div class="flex items-center"></div>
		<div class="flex items-end space-x-4">
			<p class="text-xs font-medium text-gray-600">Copyright &copy; 2023 Mandar Patil</p>
		</div>
	</div>
</div>
