import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import ConfigFile from './features/ConfigFile';
import DebugConsole from './features/DebugConsole/DebugConsole';
import DeviceList from "./features/DeviceList";
import TopNav from "./features/TopNav";
import Types from "./features/Types";
import Versions from "./features/Versions";

function App() {
  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <TopNav />
      <Suspense fallback={null}>
        <div className="p-2 overflow-hidden flex-grow-1">
          <Routes>
            <Route path="/home" element={<h1>Home</h1>} />
            <Route path="/versions" element={<Versions />} />
            <Route path="/config" element={<ConfigFile />} />
            <Route path="/devices" element={<DeviceList />} />
            <Route path="/types" element={<Types />} />
            <Route path="/console" element={<DebugConsole />} />
          </Routes>
        </div>
      </Suspense>
    </div>
  );
}

export default App;
