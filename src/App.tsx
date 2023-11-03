import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import DeviceList from "./features/DeviceList";
import TopNav from "./features/TopNav";
import Types from "./features/Types";
import Versions from "./features/Versions";

function App() {
  return (
    <div className="App">
      <TopNav />
      <Suspense fallback={null}>
        <div className="p-2">
          <Routes>
            <Route path="/home" element={<h1>Home</h1>} />
            <Route path="/versions" element={<Versions />} />
            <Route path="/devices" element={<DeviceList />} />
            <Route path="/types" element={<Types />} />
            <Route path="/console" element={<h1>Debug</h1>} />
          </Routes>
        </div>
      </Suspense>
    </div>
  );
}

export default App;
