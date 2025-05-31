import Navbar from "./components/Navbar";
import SignUpPage from "./pages/SignUpPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import {Routes, Route, Navigate} from "react-router-dom";
import {useAuthStore} from "./store/useAuthStore";
import { useEffect } from "react";
import { Loader } from "lucide-react";

const App = () => {
  const {authUser, checkAuth, isCheckingAuth} = useAuthStore();
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if(isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader size={40} className="animate-spin"/>
      </div>
    );
  }

  return (
    <>
      <div>
        <Navbar/>
        <Routes>
          <Route path="/" element={authUser ? <HomePage/> : <Navigate to="/login"/>}/>
          <Route path="/signup" element={!authUser ? <SignUpPage/> : <Navigate to="/"/>}/>
          <Route path="/login" element={!authUser ? <LoginPage/> : <Navigate to="/"/>}/>
          <Route path="/setting" element={authUser ? <SettingsPage/> : <Navigate to="/login"/>}/>
          <Route path="/profile" element={authUser ? <ProfilePage/> : <Navigate to="/login"/>}/>
        </Routes>
      </div>
    </>
  );
}

export default App;