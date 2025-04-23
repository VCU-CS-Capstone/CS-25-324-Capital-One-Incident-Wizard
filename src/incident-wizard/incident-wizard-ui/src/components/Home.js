import React, { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { Navigate } from "react-router-dom";
import "../App.css";
import LogoutButton from './LogoutButton';

const Home = () => {
  const { loggedIn, mockUser } = useContext(AuthContext);

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="home">
      <h1>Welcome, {mockUser.name}</h1>
      <LogoutButton />
      <p>Account: {mockUser.account}</p>
      <p>Balance: ${mockUser.balance}</p>
      <h2>Recent Transactions</h2>
      <ul>
        {mockUser.transactions.map((tx, idx) => (
          <li key={idx}>
            {tx.date} - {tx.description} - ${tx.amount}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Home;
