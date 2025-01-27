import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TestPage from './TestPage';
import Chatbot from './Chatbot';
import Layout from './Layout';
import Home from './Home';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Default/Home route */}
          <Route path="/" element={<Home />} />

          <Route path="/test" element={<TestPage />} />

        </Routes>
        <Chatbot />
      </Layout>
    </BrowserRouter>
  );
}

export default App;
