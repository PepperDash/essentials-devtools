import { useGetConfigQuery } from '../store/apiSlice';

const ConfigFile = () => {
    const {data: config} = useGetConfigQuery();


    if(!config) { return <div>Loading...</div> };

    return (
        <>
            <h2>ConfigFile</h2>
            <pre>
                {JSON.stringify(config, null, 2)}
            </pre>
        </>
    );
}

export default ConfigFile;