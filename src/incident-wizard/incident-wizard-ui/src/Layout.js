import React from "react";
import { Link } from 'react-router-dom';
import logo from './Capital_One-Logo.wine.png';

function Layout({ children }) {
    return (
      <div style={styles.container}>
        {/* Header with logo and "Go to Test Page" button */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <Link to="/" style={styles.logoLink}>
                <img src={logo} alt="Company Logo" style={styles.logo} />
            </Link>
            <h1>Incident Wizard</h1>

          </div>
  
        
        </header>
  
        <main style={styles.main}>{children}</main>
  
        <footer style={styles.footer}>
          <p>© 2025 Incident Wizard</p>
        </footer>
      </div>
    );
  }
  
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#f8f8f8',
      padding: '10px 20px',
      borderBottom: '1px solid #ddd',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    logo: {
      height: '40px',
      width: 'auto',
    },
    testButton: {
      backgroundColor: '#007bff',
      color: '#fff',
      padding: '8px 16px',
      textDecoration: 'none',
      borderRadius: '4px',
    },
    main: {
      flex: 1,
      padding: '20px',
    },
    footer: {
      background: '#f8f8f8',
      padding: '10px 20px',
      textAlign: 'center',
      borderTop: '1px solid #ddd',
    },
  };
  
  export default Layout;