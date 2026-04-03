import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'


const MainLayout = ({ isConnected }: { isConnected: boolean }) => {
  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <TopNav isConnected={isConnected} />
      <div className='p-2 overflow-hidden h-100'>
        <Outlet />
      </div>
    </div>
  )
}

export default MainLayout