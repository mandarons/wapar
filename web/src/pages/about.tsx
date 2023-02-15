import Footer from '@/components/footer';
import Navbar from '@/components/navbar';

const About = () => {
  return (
    <>
      <Navbar selectedItem=""></Navbar>
      <h1 data-testid='about-default' className="text-center">About Wapar</h1>
      <Footer dataGeneratedAt={null}></Footer>
    </>
  );
};
export default About;
