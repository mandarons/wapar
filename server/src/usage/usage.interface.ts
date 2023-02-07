export interface IUsageData {
    createdAt: string;
    totalInstallations: number | null;
    iCloudDocker?: {
        total: number | null;
    };
    haBouncie?: {
        total: number | null;
    };
}
