import React, { useState, useEffect } from "react";

import "./App.css";
interface Image {
  src: string;
  alt: string;
}

interface SearchResult {
  src: string;
  score: number;
}

function App() {
  const [images, setImages] = useState<Image[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 3;

  useEffect(() => {
    const fetchImages = async () => {
      const response = await fetch(
        `/getImages?page=${page}&pageSize=${pageSize}`
      );
      const data: Image[] = await response.json();
      console.log(data);
      setImages(data);
    };

    fetchImages();
  }, [page, pageSize]);

  const handleImageClick = async (imagePath: string) => {
    setSelectedImage(imagePath);
    const response = await fetch(
      `/search?imagePath=${encodeURIComponent(imagePath)}`
    );
    const matchingImages: SearchResult[] = await response.json();
    setSearchResults(matchingImages);
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white w-full">
      <div className="p-5">
        <button className="mr-4 py-2 px-4 bg-blue-500 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none">
          Index
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 p-5">
        {images.map((image, index) => (
          <div
            key={index}
            className={`w-full h-64 bg-gray-600 rounded-md flex items-center justify-center ${
              image.src === selectedImage ? "border-4 border-blue-500" : ""
            }`}
            onClick={() => handleImageClick(image.src)}
          >
            <img src={image.src} alt={image.alt} />
          </div>
        ))}
      </div>

      <div className="flex justify-center p-5">
        <button
          className="py-2 px-4 bg-blue-500 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none mr-4"
          onClick={() => setPage((prevPage) => Math.max(prevPage - 1, 1))}
        >
          Previous
        </button>
        <button
          className="py-2 px-4 bg-blue-500 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none"
          onClick={() => setPage((prevPage) => prevPage + 1)}
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 p-5">
        {searchResults.map((result, index) => (
          <div
            key={index}
            className="w-full h-64 bg-gray-600 rounded-md flex flex-col items-center justify-center my-2"
          >
            <img
              src={result.src}
              alt="Search result"
              className="w-full h-full object-cover"
            />
            <p>Score: {result.score}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
