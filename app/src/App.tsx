import { useState, useEffect, useCallback } from "react";
import { toast, Toaster } from "sonner";
import Dropzone from "react-dropzone";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
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

  const fetchImages = useCallback(async () => {
    const response = await fetch(
      `/getImages?page=${page}&pageSize=${pageSize}`
    );
    const data: Image[] = await response.json();
    console.log(data);
    setImages(data);
  }, [page, pageSize]);

  useEffect(() => {
    void fetchImages();
  }, [page, pageSize, fetchImages]);

  const handleImageDrop = async (acceptedFiles: File[]) => {
    const formData = new FormData();
    acceptedFiles.forEach((file) => {
      formData.append("images", file);
    });

    const response = await fetch(`/uploadImages?pageSize=${pageSize}`, {
      method: "POST",
      body: formData,
    });

    if (response.status === 200) {
      const { pageOfFirstImage } = await response.json();
      await fetchImages();
      setPage(pageOfFirstImage);
      const imageOrImages = acceptedFiles.length > 1 ? "Images" : "Image";
      toast.success(`${imageOrImages} uploaded successfully`);
    }
  };

  const handleIndexClick = async () => {
    setIndexing(true);
    const response = await fetch("/indexImages");
    setIndexing(false);
    if (response.status === 200) {
      setIndexSuccess(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedImage) return;

    const response = await fetch(
      `/deleteImage?imagePath=${encodeURIComponent(selectedImage)}`,
      { method: "DELETE" }
    );
    if (response.status === 200) {
      setSelectedImage(null);
      await fetchImages();
      toast.success("Image deleted successfully");
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
      <Toaster />
      <div className="flex justify-center p-5">
        <h1 className="text-4xl">Image Search</h1>
      </div>
      <Dropzone onDrop={handleImageDrop}>
        {({ getRootProps, getInputProps }) => (
          <section className="mx-5 border-dashed rounded-lg border-2 border-white hover:cursor-pointer">
            <div
              {...getRootProps()}
              className="p-5 flex justify-center items-center"
            >
              <input {...getInputProps()} />
              <p>Drag 'n' drop some files here, or click to select files</p>
            </div>
          </section>
        )}
      </Dropzone>
      <div className="p-5 flex gap-4 items-center">
        <button
          onClick={handleIndexClick}
          className={`${
            indexSuccess ? "bg-green-500" : "bg-blue-400"
          } py-2 px-4 bg-green-500 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md focus:outline-none`}
        >
          Index
        </button>
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button
              className="py-2 px-4 bg-red-500 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:bg-red-500"
              disabled={selectedImage === null}
            >
              Delete
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="bg-gray-800/80 data-[state=open]:animate-overlayShow fixed inset-0" />
            <AlertDialog.Content className="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none">
              <AlertDialog.Title className="text-gray-800 m-0 text-[17px] font-medium">
                Are you sure?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-gray-700 mt-4 mb-5 text-[15px] leading-normal">
                This action will permanently delete{" "}
                <span className="font-medium break-all">"{selectedImage}"</span>{" "}
                from the index and filesystem.
              </AlertDialog.Description>
              <div className="flex justify-end gap-[25px]">
                <AlertDialog.Cancel asChild>
                  <button className="text-gray-100 bg-gray-500 hover:bg-gray-700 focus:shadow-gray-700 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-medium leading-none outline-none focus:shadow-[0_0_0_2px]">
                    Cancel
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    className="text-red-100 bg-red-500 hover:bg-red-700 focus:shadow-red-700 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-medium leading-none outline-none focus:shadow-[0_0_0_2px]"
                    onClick={handleDeleteConfirm}
                  >
                    Yes, delete
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>

      {indexing && (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 p-5">
        {images.map((image, index) => (
          <div
            key={index}
            className={`w-full h-64 bg-gray-600 rounded-md flex items-center justify-center ${
              image.src === selectedImage ? "border-4 border-blue-500" : ""
            }`}
            onClick={() => handleImageClick(image.src)}
          >
            <img src={image.src} alt={image.alt} className="h-4/5" />
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
