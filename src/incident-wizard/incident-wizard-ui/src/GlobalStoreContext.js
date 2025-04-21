import React, { createContext, useReducer, useContext } from "react";

// Define the initial state of your global store
const initialState = {
  clientCorrelationId: "", // Unique ID per client session
  metadata: {
    // You can initialize with default values, for example:
    version: "1.0.0",
    page: window.location.href,
  },
  clickstream: [], // Array to store click/event objects
  // Additional fields can be added here as needed
};

// Create a Context
const GlobalStoreContext = createContext();

// Reducer function to update the state based on action types
function globalStoreReducer(state, action) {
  switch (action.type) {
    case "SET_CORRELATION_ID":
      return {
        ...state,
        clientCorrelationId: action.payload,
      };
    case "SET_METADATA":
      return {
        ...state,
        metadata: { ...state.metadata, ...action.payload },
      };
    case "ADD_CLICKSTREAM_EVENT":
      return {
        ...state,
        clickstream: [...state.clickstream, action.payload],
      };
    case "RESET_STORE":
      return initialState;
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

// GlobalStoreProvider component makes the store available to all children
export const GlobalStoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalStoreReducer, initialState);

  return (
    <GlobalStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalStoreContext.Provider>
  );
};

// Custom hook to access and update the global store
export const useGlobalStore = () => {
  const context = useContext(GlobalStoreContext);
  if (context === undefined) {
    throw new Error("useGlobalStore must be used within a GlobalStoreProvider");
  }
  return context;
};