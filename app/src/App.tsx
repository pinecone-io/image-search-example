import { useState, useEffect } from "react";
// import "./App.css";

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
  const [indexing, setIndexing] = useState(false);
  const [indexSuccess, setIndexSuccess] = useState(false);
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

  const handleIndexClick = async () => {
    setIndexing(true);
    const response = await fetch("/indexImages");
    setIndexing(false);
    if (response.status === 200) {
      setIndexSuccess(true);
    }
  };

  const handleImageClick = async (imagePath: string) => {
    setSelectedImage(imagePath);
    const response = await fetch(
      `/search?imagePath=${encodeURIComponent(imagePath)}`
    );
    const matchingImages: SearchResult[] = await response.json();
    setSearchResults(matchingImages);
  };

  console.log("searchResults: ", searchResults);

  return (
    <div className="min-h-screen bg-gray-800 text-white w-full">
      <div className="flex justify-center p-5">
        <h1 className="text-4xl">Image Search</h1>
      </div>
      <div className="p-5">
        <button
          onClick={handleIndexClick}
          className={`${
            indexSuccess ? "bg-green-500" : "bg-blue-400"
          } mr-4 py-2 px-4 bg-green-500 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md focus:outline-none`}
        >
          Index
        </button>
        {indexing && (
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}
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
            className="w-full h-64 bg-gray-600 rounded-md flex flex-col items-center justify-center my-2 overflow-hidden"
          >
            <img
              src={result.src}
              alt="Search result"
              className="w-full h-4/5 object-cover"
            />
            <p className="w-full text-center bg-blue-500 text-white">
              Score: {result.score}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
