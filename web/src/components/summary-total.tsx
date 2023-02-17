const SummaryTotal = ({ totalInstallations, iCloudDockerTotal, haBouncieTotal }: { totalInstallations: number; iCloudDockerTotal: number; haBouncieTotal: number }) => {
    return (
        <section className="body-font text-gray-600">
            <div className="container mx-auto px-5 py-5">
                <div className="mb-5 flex w-full flex-col text-center">
                    <h1 className="title-font mb-4 text-2xl font-medium text-gray-900 sm:text-3xl">Application Installations</h1>
                </div>
                <div className="-m-5 flex flex-wrap text-center">
                    <div className="w-1/2 p-4 sm:w-1/3">
                        <h2 data-testid="total-installations" className="title-font text-3xl font-medium text-green-600 sm:text-4xl">
                            {totalInstallations}
                        </h2>
                        <p className="leading-relaxed">Total Installations</p>
                    </div>
                    <div className="w-1/2 p-4 sm:w-1/3">
                        <h2 data-testid="icloud-drive-docker-total-installations" className="title-font text-3xl font-medium text-green-600 sm:text-4xl">
                            {iCloudDockerTotal}
                        </h2>
                        <p className="leading-relaxed">iCloud Drive Docker</p>
                    </div>
                    <div className="w-1/2 p-4 sm:w-1/3">
                        <h2 data-testid="ha-bouncie-total-installations" className="title-font text-3xl font-medium text-green-600 sm:text-4xl">
                            {haBouncieTotal}
                        </h2>
                        <p className="leading-relaxed">Home Assistant - Bouncie</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SummaryTotal;
