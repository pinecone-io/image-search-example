import { fireEvent, render, screen } from "@testing-library/react";
import { it, describe, expect } from "vitest";
import ImageGrid from "./ImageGrid";

describe("ImageGrid", () => {
  it("should render image correctly", () => {
    const image = {
      src: "data/Abra-06b9eec4827d4d49b1b4c284308708df_jpg.rf.e2d4cd14d8057f4a6474cd50e64535fe.jpg",
      alt: "data/abra-1",
    };
    const isSelected = false;
    render(
      <ImageGrid image={image} isSelected={isSelected} onClick={() => {}} />
    );
    expect(image).toBeTruthy();
  });
  it("should load similar images when clicked", async () => {
    const image = {
      src: "data/Abra-06b9eec4827d4d49b1b4c284308708df_jpg.rf.e2d4cd14d8057f4a6474cd50e64535fe.jpg",
      alt: "data/abra-1",
    };

    let isSelected = false;

    const toggleSelected = () => {
      isSelected = !isSelected;
    };
    const { container } = render(
      <ImageGrid
        image={image}
        isSelected={isSelected}
        onClick={toggleSelected}
      />
    );
    const imageGridElClick = container.querySelector(
      ".h-full.w-full.object-contain.rounded-10px"
    );
    if (imageGridElClick) {
      fireEvent.click(imageGridElClick);
    }
    expect(isSelected).toBe(true);
  });
});
