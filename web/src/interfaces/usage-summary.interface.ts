interface IUsageSummary {
    totalInstallations: number;
    createdAt: string;
    countryToCount: { countryCode: string; count: number }[];
    monthlyActive: number;
    iCloudDocker: {
        total: number;
    };
    haBouncie: {
        total: number;
    };
}

export default IUsageSummary;
