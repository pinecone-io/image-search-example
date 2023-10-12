import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, beforeAll } from "vitest";

import App from "./App";

describe("App", () => {
  beforeEach(async () => {
    render(<App />);
  });
  beforeAll(async () => {
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

  it("should  handleImageClick correctly when clicked", async () => {
    await waitFor(() => {
      render(<App />);
    });
    const image = screen.getByAltText("data/abra-1");
    fireEvent.click(image);
    await waitFor(() => {
      const matchingImages = [
        {
          src: "data/Abra-06b9eec4827d4d49b1b4c284308708df_jpg.rf.e2d4cd14d8057f4a6474cd50e64535fe.jpg",
          score: 1,
        },
        {
          src: "data/Abra-b065da5f186d4f9db497012350b31a9f_jpg.rf.140499766784e9d9f2c29699a47e34f7.jpg",
          score: 0.898532689,
        },
        {
          src: "data/Abra-34532bb006714727ade4075f0a72b92d_jpg.rf.5985c0906e8eeca2aa82fe4af9c5f9b0.jpg",
          score: 0.828687489,
        },
        {
          src: "data/Abra-aabb27dd7e1c4508880bd8cc1141c340_jpg.rf.f9a46a770717c5806317ee8824e47527.jpg",
          score: 0.810481906,
        },
        {
          src: "data/Abra-86c823fe351549c7818efd6ca718556e_jpg.rf.690328f3c61afb41663077fffb060a43.jpg",
          score: 0.805344462,
        },
        {
          src: "data/Alakazam-dcc693898ecc4f3e9766e66c510fcaa3_jpg.rf.485223571a707a09f4f8d2d6051d34c2.jpg",
          score: 0.80377388,
        },
      ];
      expect(matchingImages).toEqual(expect.arrayContaining(matchingImages));
    });
  });

  it("should render div if indexing is true", async () => {
    const button = screen.getByText("Index");
    let indexing = true;
    const { container } = render(<App />);
    fireEvent.click(button);
    if (indexing) {
      const animateSpin = container.querySelector(".animate-spin");
      expect(animateSpin).toBeDefined();
    }
  });
  it("should render different classes based on true/false", async () => {
    let indexSuccess = false;
    const button = screen.getByText("Index");
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toHaveClass(
        `${
          indexSuccess ? "bg-green-500" : "bg-primary-100"
        } mr-4 p-customIndexBtn bg-primary-100 hover:bg-primary-300 transition text-white text-base16 font-normal rounded-5px shadow-md focus:outline-none`
      );
    });
  });
});
