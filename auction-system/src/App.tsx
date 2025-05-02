import React, { createContext, useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import UserProfile from './pages/UserProfile';
import ProductDetails from './pages/ProductDetails';
import './App.css';

type AuthContextType = {
  user: any | null;
  signIn: (data: any) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function App() {
  const [user, setUser] = useState<any | null>(null);

  const authValue = {
    user,
    signIn: (data: any) => setUser(data),
    signOut: () => setUser(null)
  };

  return (
    <Router>
      <AuthContext.Provider value={authValue}>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/products/:id" element={<ProductDetails />} />
          </Routes>
        </div>
      </AuthContext.Provider>
    </Router>
  );
}

export default App;
