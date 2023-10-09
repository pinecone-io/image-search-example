import { useState, useEffect } from "react";
import Headline from "./components/Headline";
import Header from "./components/Header";
import ImageGrid from "./components/ImageGrid";
import SearchResultItem from "./components/SearchResultItem";
import NavButtons from "./components/NavButtons";
import Footer from "./components/Footer";

export interface Image {
  src: string;
  alt: string;
}

export interface SearchResult {
  src: string;
  score: number;
}

const App = () => {
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

  return (
    <div className="min-h-screen text-white w-full">
      <Header />
      <Headline />
      <div className="px-5">
        <button
          onClick={handleIndexClick}
          className={`${
            indexSuccess ? "bg-green-500" : "bg-primary-100"
          } mr-4 p-customIndexBtn bg-primary-100 hover:bg-primary-300 transition text-white text-base16 font-normal rounded-5px shadow-md focus:outline-none`}
        >
          Index
        </button>
        {indexing && (
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-customImageGrid">
        {images.map((image, index) => (
          <ImageGrid
            key={index}
            image={image}
            isSelected={image.src === selectedImage}
            onClick={() => handleImageClick(image.src)}
          />
        ))}
      </div>

      <NavButtons setPage={setPage} currentPage={page} />

      <div className="grid grid-cols-1 md:grid-cols-3 grid-cols-3 gap-4 p-5">
        {searchResults.map((result, index) => (
          <SearchResultItem key={index} result={result} />
        ))}
      </div>
      <Footer />
    </div>
  );
};

export default App;
