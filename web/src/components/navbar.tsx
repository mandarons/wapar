const defaultButtonClasses = 'p-4 px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-700 hover:text-white';
const selectedItemClasses = 'bg-gray-700 text-white';

const Navbar = ({ selectedItem }: { selectedItem: string }) => {
  return (
    <nav className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-4">
        <a href="/">
          <svg height="60" width="60">
            <image xlinkHref="/favicon.svg" height="60" width="60" />
          </svg>
        </a>
        <h1 className="text-2xl font-semibold">Wapar</h1>
      </div>
      <div className="flex items-center space-x-4"></div>
      <div className="flex items-end space-x-4">
        <a href="/about" className={`${defaultButtonClasses} `}>
          About
        </a>
        <a href={`https://github.com/mandarons`}>
          <svg height="40" width="40">
            <image xlinkHref="/github.svg" height="40" width="40" />
          </svg>
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
