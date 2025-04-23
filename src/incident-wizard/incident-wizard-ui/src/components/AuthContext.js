import React, { createContext, useState, useEffect } from "react";
import "../App.css";
// Load metadata.json from public folder
// Make sure metadata.json is copied into your public/ directory
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [metadata, setMetadata] = useState(null);

  // Mock user data (same as in Flask)
  const mockUser = {
    username: "johndoe",
    password: "test123",
    name: "John Doe",
    account: "1234567890",
    balance: "8,215.67",
    transactions: [
      { date: "2025-04-08", description: "Grocery Store", amount: "85.23" },
      { date: "2025-04-06", description: "Online Subscription", amount: "15.99" },
      { date: "2025-04-04", description: "Coffee Shop", amount: "4.75" }
    ]
  };

  // on mount, fetch metadata.json
  useEffect(() => {
    fetch("/metadata.json")
      .then(res => res.json())
      .then(setMetadata)
      .catch(console.error);
  }, []);

  const login = (username, password) => {
    if (username === mockUser.username && password === mockUser.password) {
      setLoggedIn(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout, mockUser, metadata }}>
      {children}
    </AuthContext.Provider>
  );
};
