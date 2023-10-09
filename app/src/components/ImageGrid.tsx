import { Image } from "../App";

interface ImageGridProps {
  image: Image;
  isSelected: boolean;
  onClick: () => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({
  image,
  isSelected,
  onClick,
}) => {
  return (
    <div
      className={`w-full h-64 bg-gray-800 rounded-10px flex items-center justify-center ${
        isSelected ? "border-4 border-blue-500" : ""
      }`}
      onClick={onClick}
    >
      <img
        src={"/" + image.src}
        alt={image.alt}
        className="h-full w-full object-contain rounded-10px"
      />
    </div>
  );
};

export default ImageGrid;
