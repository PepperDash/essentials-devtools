import { useGetConfigQuery } from '../store/apiSlice';

const ConfigFile = () => {
    const {data: config} = useGetConfigQuery();


    if(!config) { return <div>Loading...</div> };

    return (
        <div className="d-flex flex-column overflow-hidden h-100">
            <h2 className='mb-2'>Merged Configuration</h2>
            <pre className='flex-grow-1 overflow-auto'>
                {JSON.stringify(config, null, 2)}
            </pre>
        </div>
    );
}

export default ConfigFile;