import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "./App";

// ---------------------------------------------------------------------------
// Layer 5: React component tests (jsdom).
//
// Renders the real App with `fetch` stubbed, verifying the frontend calls the
// right endpoints and reflects responses in the UI. Guards against breakage
// from react / vite / testing-library bumps.
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  // Default routing by URL; individual tests can override.
  fetchMock.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/getImages")) {
      return jsonResponse([{ src: "data/a.jpg" }, { src: "data/b.jpg" }]);
    }
    if (url.startsWith("/search")) {
      return jsonResponse([{ src: "data/match.jpg", score: 0.87 }]);
    }
    if (url.startsWith("/indexImages")) return jsonResponse({ message: "ok" });
    if (url.startsWith("/uploadImages")) {
      return jsonResponse({ pageOfFirstImage: 1 });
    }
    if (url.startsWith("/deleteImage")) {
      return jsonResponse({ message: "deleted" });
    }
    return jsonResponse({});
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("fetches and renders images on mount", async () => {
    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/getImages?page=1&pageSize=3");
    });

    const imgs = await screen.findAllByRole("img");
    const srcs = imgs.map((img) => (img as HTMLImageElement).getAttribute("src"));
    expect(srcs).toContain("data/a.jpg");
    expect(srcs).toContain("data/b.jpg");
  });

  it("runs a similarity search when an image is clicked and shows scores", async () => {
    render(<App />);

    const [firstImage] = await screen.findAllByRole("img");
    // Clicking the image bubbles to the grid cell's onClick, which runs search.
    fireEvent.click(firstImage);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/search?imagePath=")
      );
    });

    expect(await screen.findByText(/Score:\s*0\.87/)).toBeInTheDocument();
    expect(
      (await screen.findAllByRole("img")).map((i) =>
        i.getAttribute("src")
      )
    ).toContain("data/match.jpg");
  });

  it("triggers indexing when the Index button is clicked", async () => {
    render(<App />);
    await screen.findAllByRole("img");

    fireEvent.click(screen.getByRole("button", { name: "Index" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/indexImages");
    });
  });

  it("advances the page and refetches when Next is clicked", async () => {
    render(<App />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/getImages?page=1&pageSize=3");
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/getImages?page=2&pageSize=3");
    });
  });

  it("does not go below page 1 when Previous is clicked", async () => {
    render(<App />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/getImages?page=1&pageSize=3");
    });

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    // Page is clamped at 1, so no page=0 request is ever made.
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalledWith("/getImages?page=0&pageSize=3");
  });
});
