import React, { useContext } from "react";
import { AuthContext } from "../AuthContext";
import "../App.css";

const MetadataPage = () => {
  const { metadata } = useContext(AuthContext);

  if (!metadata) {
    return <p>Loading metadata…</p>;
  }

  return (
    <div>
      <h2>App Metadata</h2>
      <pre>{JSON.stringify(metadata, null, 2)}</pre>
    </div>
  );
};

export default MetadataPage;
