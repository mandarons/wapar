import { useEffect, useState } from 'react';

const Footer = ({ dataGeneratedAt }: { dataGeneratedAt: string | null } = { dataGeneratedAt: null }) => {
  const [data, setData] = useState(dataGeneratedAt);
  useEffect(() => {
    if (data) {
      setData(new Date(data).toLocaleString());
    }
  });
  return (
    <footer>
      <div className="fixed bottom-0 w-full border-t">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center"></div>
          <div className="flex items-end space-x-4">
            {data && (
              <p className="text-xs font-medium text-gray-600">
                Generated at: <span id="data-generated-at">{data}</span>
              </p>
            )}
            <p className="text-xs font-medium text-gray-600">Copyright &copy; 2023 Mandar Patil</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
