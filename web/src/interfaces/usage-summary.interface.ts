interface IUsageSummary {
  totalInstallations: number | null;
  createdAt: string;
  iCloudDocker: {
    total: number | null;
  };
  haBouncie: {
    total: number | null;
  };
}

export default IUsageSummary;
