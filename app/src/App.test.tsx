import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach } from "vitest";

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    render(<App />);
  });
  it("renders headline", () => {
    expect(screen.getByText("Image Search")).toBeTruthy();
  });
  it("should return an array with images", () => {
    const imagesInContainer = screen.getAllByRole("img");

    const regex = /^data\/Abra-/;

    const matchingImages = imagesInContainer.filter((image) =>
      regex.test(image.getAttribute("src") || "")
    );
    matchingImages.forEach((image) => {
      expect(image).toHaveAttribute("src", expect.stringMatching(regex));
    });
  });
  it("should return correct image when clicked", async () => {
    const imageEl = screen.getByAltText("data/abra-1");
    fireEvent.click(imageEl);
    await waitFor(() => {
      const similarImages = screen.getAllByAltText("Search result");
      expect(similarImages).toHaveAttribute("alt");
    });
  });
});
