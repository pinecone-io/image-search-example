import { SearchResult } from "../App";

interface SearchResultProps {
  result: SearchResult;
}

const SearchResultItem: React.FC<SearchResultProps> = ({ result }) => {
  return (
    <div className="relative w-full h-64 bg-gray-800 rounded-10px flex flex-col items-center justify-center mt-2 my-2 overflow-hidden">
      <img
        src={result.src}
        alt="Search result"
        className="w-full h-full object-contain rounded-10px"
      />
      <p className="absolute bottom-5 right-4 p-2.5 text-sm12 font-semibold rounded-10px text-center bg-gray-900 text-white">
        <span className="font-normal">Score:</span> {result.score}
      </p>
    </div>
  );
};

export default SearchResultItem;
