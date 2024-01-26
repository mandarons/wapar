<script lang="ts">
	import { Table, tableMapperValues } from '@skeletonlabs/skeleton';
	import type { TableSource } from '@skeletonlabs/skeleton';
	export let data: {
		totalInstallations: number;
		monthlyActive: number;
		createdAt: string;
		countryToCount: { countryCode: string; count: number }[];
		iCloudDocker: { total: number };
		haBouncie: { total: number };
	};
	let regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
	const countryTable: TableSource = {
		head: ['Country', 'Count'],
		body: tableMapperValues(
			data.countryToCount.map((c) => ({
				countryName: regionNames.of(c.countryCode),
				count: c.count
			})),
			['countryName', 'count']
		)
	};
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
		<div
			class="flex justify-center items-center mx-auto w-full border border-gray-200 rounded-2xl overflow-hidden p-4 m-12"
		>
			<Table source={countryTable} />
		</div>
	</div>
</section>
