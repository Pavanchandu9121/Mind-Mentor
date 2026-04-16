import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import ChatBot from './components/ChatBot';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Assessment from './pages/Assessment';
import Results from './pages/Results';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import LiveScreening from './pages/LiveScreening';
import ScreeningResults from './pages/ScreeningResults';
import Profile from './pages/Profile';
import Community from './pages/Community';
import Healthcare from './pages/Healthcare';
import { ScreeningProvider } from './context/ScreeningContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScreeningProvider>
          <Navbar />
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/assessment" element={
            <PrivateRoute><Assessment /></PrivateRoute>
          } />
          <Route path="/results/:id" element={
            <PrivateRoute><Results /></PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute><Dashboard /></PrivateRoute>
          } />
          <Route path="/screening" element={
            <PrivateRoute><LiveScreening /></PrivateRoute>
          } />
          <Route path="/screening/results" element={
            <PrivateRoute><ScreeningResults /></PrivateRoute>
          } />
          <Route path="/screening/results/:id" element={
            <PrivateRoute><ScreeningResults /></PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute><Profile /></PrivateRoute>
          } />
          <Route path="/community" element={
            <PrivateRoute><Community /></PrivateRoute>
          } />
          <Route path="/healthcare" element={
            <PrivateRoute><Healthcare /></PrivateRoute>
          } />
          <Route path="/resources" element={<Resources />} />
          </Routes>
          <ChatBot />
        </ScreeningProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
