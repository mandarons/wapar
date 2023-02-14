import Footer from '@/components/footer';
import Navbar from '@/components/navbar';
import IUsageSummary from '@/interfaces/usage-summary.interface';

const Home = ({ data }: { data: IUsageSummary }) => {
  return (
    <>
      <Navbar selectedItem=""></Navbar>
      <section className="body-font text-gray-600">
        <div className="container mx-auto px-5 py-5">
          <div className="mb-5 flex w-full flex-col text-center">
            <h1 className="title-font mb-4 text-2xl font-medium text-gray-900 sm:text-3xl">Application Installations</h1>
          </div>
          <div className="-m-5 flex flex-wrap text-center">
            <div className="w-1/2 p-4 sm:w-1/3">
              <h2 className="title-font text-3xl font-medium text-green-600 sm:text-4xl">{data.totalInstallations}</h2>
              <p className="leading-relaxed">Total Installations</p>
            </div>
            <div className="w-1/2 p-4 sm:w-1/3">
              <h2 className="title-font text-3xl font-medium text-green-600 sm:text-4xl">{data.iCloudDocker.total}</h2>
              <p className="leading-relaxed">iCloud Drive Docker</p>
            </div>
            <div className="w-1/2 p-4 sm:w-1/3">
              <h2 className="title-font text-3xl font-medium text-green-600 sm:text-4xl">{data.haBouncie.total}</h2>
              <p className="leading-relaxed">Home Assistant - Bouncie</p>
            </div>
          </div>
        </div>
      </section>
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
