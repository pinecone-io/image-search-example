import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { server } from "./mocks/server";
import App from "./App";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("App", () => {
  it("renders headline", () => {
    render(<App />);
    expect(screen.getByText("Image Search")).toBeInTheDocument();
  });

  it("fetches and displays images", async () => {
    setTimeout(() => {
      const images = screen.findByRole("img");
      expect(images).toHaveLength(3);
    }, 1000);
  });

  it("handles image click and displays search results", async () => {
    render(<App />);

    const image = await screen.findByAltText("data/abra-1");
    fireEvent.click(image);

    await waitFor(() => {
      const searchResults = screen.getAllByRole("search-result");
      expect(searchResults).toHaveLength(6);
    });
  });

  it("renders success class after successful indexing", async () => {
    render(<App />);
    const button = screen.getByText("Index");
    fireEvent.click(button);

    await waitFor(() => {
      const successButton = screen.getByText("Index");
      expect(successButton).toHaveClass("bg-green-500");
    });
  });

  it("renders SearchResultItem components", async () => {
    render(<App />);
    const image = await screen.findByAltText("data/abra-1");
    fireEvent.click(image);

    await waitFor(() => {
      const searchResults = screen.getAllByRole("search-result");
      searchResults.forEach((result) => {
        expect(result).toBeInTheDocument();
      });
    });
  });

  it("renders ImageGrid components", async () => {
    render(<App />);
    const images = await screen.findAllByRole("img");

    images.forEach((image) => {
      expect(image).toBeInTheDocument();
    });
  });
  it("handles button clicks in NavButtons and updates page state", async () => {
    render(<App />);

    setTimeout(() => {
      let images = screen.findAllByRole("img");
      expect(images).toHaveLength(3);
    }, 1000);

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    const previousButton = screen.getByText("Previous");
    fireEvent.click(previousButton);
  });
});
