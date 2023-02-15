import Link from 'next/link';

const defaultButtonClasses = 'p-4 px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-700 hover:text-white';
const selectedItemClasses = 'bg-gray-700 text-white';

const Navbar = ({ selectedItem }: { selectedItem: string }) => {
  return (
    <nav className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-4">
        <Link href="/">
          <svg height="60" width="60">
            <image data-testid='favicon.svg' xlinkHref="/favicon.svg" height="60" width="60" />
          </svg>
        </Link>
        <h1 className="text-2xl font-semibold">Wapar</h1>
      </div>
      <div className="flex items-center space-x-4"></div>
      <div className="flex items-end space-x-4">
        <Link href="/about" className={`${defaultButtonClasses} `}>
          About
        </Link>
        <Link href={`https://github.com/mandarons`}>
          <svg height="40" width="40">
            <image data-testid='github.svg' xlinkHref="/github.svg" height="40" width="40" />
          </svg>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
