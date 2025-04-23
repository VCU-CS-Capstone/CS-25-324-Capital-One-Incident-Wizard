import React, { useState, useContext } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import "../App.css";

const LoginPage = () => {
  const { loggedIn, login } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = e => {
    e.preventDefault();
    if (login(username, password)) {
      navigate("/");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <h2 className="login__title">Sign In</h2>
        <form className="login__form" onSubmit={handleSubmit}>
          <div className="login__field">
            <label className="login__label">Username</label>
            <input
              className="login__input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="login__field">
            <label className="login__label">Password</label>
            <input
              type="password"
              className="login__input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login__button">
            Log In
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
