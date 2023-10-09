import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

interface NavButtonsProps {
  setPage: (page: number) => void;
  currentPage: number;
}

const NavButtons: React.FC<NavButtonsProps> = ({ setPage, currentPage }) => {
  return (
    <div className="flex justify-center p-customNavButtons">
      <button
        className="focus:outline-none text-primary-600 hover:text-gray-900 mr-38px font-normal transition"
        onClick={() => setPage(currentPage - 1)}
      >
        <FontAwesomeIcon
          icon={faArrowLeft}
          className="text-primary-300 mr-11px"
        />
        Previous
      </button>

      <button
        className="focus:outline-none text-primary-600 hover:text-gray-900 font-normal transition"
        onClick={() => setPage(currentPage + 1)}
      >
        Next
        <FontAwesomeIcon
          icon={faArrowRight}
          className="text-primary-300 ml-11px"
        />
      </button>
    </div>
  );
};
export default NavButtons;
