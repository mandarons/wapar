import { useEffect, useRef } from 'react';
import 'svgmap/dist/svgMap.min.css';
const WorldMap = ({ countryToCount }: { countryToCount: { countryCode: string; count: number }[] }) => {
    let mapData = useRef(Object.fromEntries(new Map(countryToCount.map(({ countryCode, count }) => [countryCode, { installations: count }]))));
    const map = useRef(null);
    useEffect(() => {
        const svgMap = require('svgmap');
        console.log(mapData.current);
        if (!map.current) {
            map.current = new svgMap({
                targetElementID: 'svgMap',
                minZoom: 1,
                maxZoom: 2,
                initialZoom: 1,
                showContinentSelector: false,
                zoomScaleSensitivity: 1,
                showZoomReset: false,
                mouseWheelZoomEnabled: false,
                mouseWheelZoomWithKey: false,
                mouseWheelZoomKeyMessage: 'Not enabled',
                mouseWheelKeyMessageMac: 'Not enabled',
                flagType: 'emoji',
                noDataText: 'No installations detected',
                colorMax: '#09431e',
                colorMin: '#bcf6d1',
                data: {
                    data: {
                        installations: {
                            name: 'Installations',
                            format: '{0}',
                            thousandSeparator: ',',
                            thresholdMax: 50000,
                            thresholdMin: 0,
                        },
                    },
                    applyData: 'installations',
                    values: mapData.current,
                },
            });
        }
    }, [mapData, map]);

    return (
        <div className="container mx-auto flex flex-col items-center">
            <div id="svgMap" className="w-11/12 flex-col items-center justify-center"></div>
        </div>
    );
};

export default WorldMap;
