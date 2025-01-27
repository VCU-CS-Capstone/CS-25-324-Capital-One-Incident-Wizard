import React, { useState, useEffect } from 'react';

function TestPage() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('https://my-backend-latest-7n9l.onrender.com/api/example-data') // Your Flask endpoint
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        if (json.success) {
          setBanks(json.banks);
        } else {
          throw new Error(json.error || 'Unknown error');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading banking data...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <h2>Test Banking Data</h2>
      {banks.length > 0 ? (
        <table border="1" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Bank Name</th>
              <th>Account Number</th>
              <th>Routing Number</th>
              <th>IBAN</th>
              <th>SWIFT/BIC</th>
            </tr>
          </thead>
          <tbody>
            {banks.map((bank, index) => (
              <tr key={index}>
                <td>{bank.bank_name}</td>
                <td>{bank.account_number}</td>
                <td>{bank.routing_number}</td>
                <td>{bank.iban}</td>
                <td>{bank.swift_bic}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No bank data found.</p>
      )}
    </div>
  );
}

export default TestPage;