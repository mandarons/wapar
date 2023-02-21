import Footer from '@/components/footer';
import Navbar from '@/components/navbar';
import SummaryTotal from '@/components/summary-total';
import WorldMap from '@/components/world-map';
import IUsageSummary from '@/interfaces/usage-summary.interface';

const Home = ({ data }: { data: IUsageSummary }) => {
    return (
        <>
            <Navbar selectedItem=""></Navbar>
            <div className="flex w-full flex-col">
                <SummaryTotal
                    // monthlyActive={data.monthlyActive}
                    totalInstallations={data.totalInstallations + data.haBouncie.total}
                    iCloudDockerTotal={data.iCloudDocker.total}
                    haBouncieTotal={data.haBouncie.total}
                />
                <WorldMap countryToCount={data.countryToCount} />
            </div>
            <Footer dataGeneratedAt={data.createdAt}></Footer>
        </>
    );
};

const getStaticProps = async () => {
    let res = await fetch('https://wapar-api.mandarons.com/api/usage');
    const waparData = await res.json();
    res = await fetch('https://analytics.home-assistant.io/custom_integrations.json');
    const haData = await res.json();
    const data = { ...waparData };
    data.haBouncie = haData.bouncie;
    return {
        props: { data },
    };
};

export default Home;

export { getStaticProps };
