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
                <SummaryTotal totalInstallations={data.totalInstallations} iCloudDockerTotal={data.iCloudDocker.total} haBouncieTotal={data.haBouncie.total} />
                <WorldMap countryToCount={data.countryToCount} />
            </div>
            <Footer dataGeneratedAt={data.createdAt}></Footer>
        </>
    );
};

const getStaticProps = async () => {
    const res = await fetch('https://wapar-api.mandarons.com/api/usage');
    const data = await res.json();
    return {
        props: { data },
    };
};

export default Home;

export { getStaticProps };
