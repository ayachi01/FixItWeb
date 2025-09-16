// import React from "react";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Login from "./components/Login";
// import Register from "./components/Register";
// import GuestReport from "./components/GuestReport";
// import Dashboard from "./components/Dashboard";

// const App: React.FC = () => {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Login />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/register" element={<Register />} />
//         <Route path="/guest-report" element={<GuestReport />} />
//         <Route path="/dashboard" element={<Dashboard />} />
//       </Routes>
//     </BrowserRouter>
//   );
// };

// export default App;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/dashboard" element={<h1>Dashboard (Protected)</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
