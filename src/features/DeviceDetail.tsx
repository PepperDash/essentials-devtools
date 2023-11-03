import { IKeyed } from '../store/apiSlice';

const DeviceDetail = ({item}: DeviceDetailProps) => {
  
  return <>
    <h2>Device Detail</h2>
  </>;
}

export default DeviceDetail;

interface DeviceDetailProps {
  item: IKeyed | undefined;
}