// @vitest-environment jsdom
import React, { type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Movie } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  authState: {
    listener: null as null | ((user: unknown) => void),
  },
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("firebase/app", () => ({
  FirebaseError: class FirebaseError extends Error {
    code = "";
  },
}));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class GoogleAuthProvider {
    setCustomParameters() {}
  },
  onAuthStateChanged: (_auth: unknown, listener: (user: unknown) => void) => {
    mocks.authState.listener = listener;
    return vi.fn();
  },
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/firebase", () => ({
  firebaseConfigured: true,
  getFirebaseAuth: () => ({}),
}));
vi.mock("@/lib/firebase-watchlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/firebase-watchlist")>();
  return {
    ...actual,
    listFirebaseWatchlist: mocks.list,
    saveFirebaseWatchlistMovie: mocks.save,
    deleteFirebaseWatchlistMovie: mocks.remove,
  };
});

import { AppProviders, useWatchlist } from "@/components/app-providers";

const card = (id: number, title: string): Movie => ({
  id,
  title,
  overview: "Test",
  releaseDate: "2024-01-01",
  rating: 8,
  posterPath: null,
  backdropPath: null,
  genres: ["Drama"],
  runtime: 90,
  language: "en",
});
const guestMovie = card(105, "Guest film");
const userAMovie = card(693134, "User A film");
const userBMovie = card(157336, "User B film");

function Probe() {
  const list = useWatchlist();
  return (
    <div>
      <span data-testid="ready">{String(list.ready && list.configReady)}</span>
      <div data-testid="movies">
        {list.movies.map((movie) => (
          <span key={movie.id}>{movie.title}</span>
        ))}
      </div>
      <button onClick={() => list.toggle(guestMovie)}>Save guest film</button>
    </div>
  );
}

const app = () => (
  <AppProviders>
    <Probe />
  </AppProviders>
);

function setUser(userId: "a" | "b" | null) {
  act(() => {
    mocks.authState.listener?.(
      userId ? { uid: `user-${userId}`, displayName: `User ${userId}` } : null,
    );
  });
}

beforeEach(() => {
  localStorage.clear();
  mocks.authState.listener = null;
  mocks.list.mockImplementation(async (userId: string) =>
    userId === "user-a" ? [userAMovie] : [userBMovie],
  );
  mocks.save.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.resetAllMocks();
});

describe("Firebase account and browser watchlist separation", () => {
  it("keeps guest saves separate and never exposes another account's list", async () => {
    const view = render(app());
    await waitFor(() => expect(mocks.authState.listener).not.toBeNull());
    setUser(null);
    await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
    fireEvent.click(screen.getByRole("button", { name: "Save guest film" }));
    await waitFor(() =>
      expect(screen.getByTestId("movies").textContent).toContain("Guest film"),
    );

    setUser("a");
    await waitFor(() =>
      expect(screen.getByTestId("movies").textContent).toContain("User A film"),
    );
    expect(screen.getByTestId("movies").textContent).not.toContain("Guest film");

    setUser("b");
    await waitFor(() =>
      expect(screen.getByTestId("movies").textContent).toContain("User B film"),
    );
    expect(screen.getByTestId("movies").textContent).not.toContain("User A film");
    expect(screen.getByTestId("movies").textContent).not.toContain("Guest film");

    setUser(null);
    await waitFor(() =>
      expect(screen.getByTestId("movies").textContent).toContain("Guest film"),
    );
    expect(screen.getByTestId("movies").textContent).not.toContain("User A film");
    expect(screen.getByTestId("movies").textContent).not.toContain("User B film");
  });

  it("ignores a late Firestore result from a previously signed-in account", async () => {
    let resolveA!: (movies: Movie[]) => void;
    const lateA = new Promise<Movie[]>((resolve) => {
      resolveA = resolve;
    });
    mocks.list.mockImplementation((userId: string) =>
      userId === "user-a" ? lateA : Promise.resolve([userBMovie]),
    );

    render(app());
    await waitFor(() => expect(mocks.authState.listener).not.toBeNull());
    setUser(null);
    await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
    setUser("a");
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith("user-a"));
    setUser("b");
    await waitFor(() =>
      expect(screen.getByTestId("movies").textContent).toContain("User B film"),
    );

    await act(async () => {
      resolveA([userAMovie]);
      await lateA;
    });
    expect(screen.getByTestId("movies").textContent).toContain("User B film");
    expect(screen.getByTestId("movies").textContent).not.toContain("User A film");
  });
});
