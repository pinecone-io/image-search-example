import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-gray-800 text-white w-full">
      <div className="p-5">
        <button className="mr-4 py-2 px-4 bg-blue-500 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none">
          Index
        </button>
        <button className="py-2 px-4 bg-blue-500 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none">
          Query
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 p-5">
        {Array(9)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="w-full h-64 bg-gray-600 rounded-md flex items-center justify-center"
            >
              <span>Placeholder</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
