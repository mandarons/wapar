import WorldMapSVG from 'react-svg-worldmap';
const WorldMap = ({ countryToCount }: { countryToCount: { countryCode: string; count: number }[] }) => {
    const data = countryToCount.map(({ countryCode, count }) => ({ country: countryCode, value: count }));
    return (
        <div className="App">
            <WorldMapSVG color="red" title="Active Installations" value-suffix="people" size="lg" data={data} />
        </div>
    );
};

export default WorldMap;
