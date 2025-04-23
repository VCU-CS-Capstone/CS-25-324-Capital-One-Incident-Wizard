import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TestPage from './TestPage';
import Chatbot from './Chatbot';
import Layout from './Layout';
import Home from './components/Home';
import LoginPage from './components/LoginPage';
import { AuthProvider } from './components/AuthContext';
import { GlobalStoreProvider } from './GlobalStoreContext';
import './App.css';

function App() {
  return (
    <GlobalStoreProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
        
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Home />} />
              <Route path="/test" element={<TestPage />} />
            </Routes>

            <Chatbot />
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </GlobalStoreProvider>
  );
}

export default App;
