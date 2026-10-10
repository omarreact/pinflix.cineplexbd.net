"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  deleteFirebaseWatchlistMovie,
  isStoredMovie,
  listFirebaseWatchlist,
  saveFirebaseWatchlistMovie,
} from "@/lib/firebase-watchlist";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import type { Movie } from "@/lib/types";

const GUEST_STORAGE_KEY = "pinflix:watchlist:v1";
type SyncState = "local" | "syncing" | "synced" | "error";
type AuthStatus = "loading" | "authenticated" | "unauthenticated";
type AccountState = {
  ownerId: string | null;
  movies: Movie[];
  ready: boolean;
  sync: SyncState;
  pending: number[];
};
type WatchlistContextValue = {
  movies: Movie[];
  ready: boolean;
  authEnabled: boolean;
  authStatus: AuthStatus;
  configReady: boolean;
  user: User | null;
  authError: string | null;
  storageWarning: string | null;
  syncState: SyncState;
  pendingIds: number[];
  isSaved: (id: number) => boolean;
  toggle: (movie: Movie) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};
const WatchlistContext = createContext<WatchlistContextValue | null>(null);

function WatchlistProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [configReady, setConfigReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [guestMovies, setGuestMovies] = useState<Movie[]>([]);
  const [guestReady, setGuestReady] = useState(false);
  const [accountState, setAccountState] = useState<AccountState>({
    ownerId: null,
    movies: [],
    ready: false,
    sync: "local",
    pending: [],
  });
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const guestRef = useRef<Movie[]>([]);
  const userId = firebaseConfigured ? user?.uid ?? null : null;
  const ownerRef = useRef<string | null>(userId);
  ownerRef.current = userId;
  const accountRef = useRef(accountState);
  accountRef.current = accountState;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      getFirebaseAuth(),
      (nextUser) => {
        setUser(nextUser);
        setAuthError(null);
        setConfigReady(true);
      },
      (error) => {
        setUser(null);
        setAuthError(
          error instanceof FirebaseError
            ? "Firebase Authentication could not be initialized. Check the project’s Auth settings."
            : "Firebase Authentication could not be initialized.",
        );
        setConfigReady(true);
      },
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      const stored: unknown = raw ? JSON.parse(raw) : [];
      const saved = Array.isArray(stored) ? stored.filter(isStoredMovie).slice(0, 500) : [];
      guestRef.current = saved;
      setGuestMovies(saved);
    } catch {
      setStorageWarning(
        "Your browser could not restore saved films. New saves will remain available during this visit.",
      );
    }
    setGuestReady(true);
  }, []);

  useEffect(() => {
    guestRef.current = guestMovies;
    if (!guestReady) return;
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestMovies));
    } catch {
      setStorageWarning("Browser storage is unavailable. Your watchlist will last for this visit only.");
    }
  }, [guestMovies, guestReady]);

  useEffect(() => {
    if (!userId) {
      setAccountState({
        ownerId: null,
        movies: [],
        ready: false,
        sync: "local",
        pending: [],
      });
      return;
    }

    let active = true;
    setAccountState({
      ownerId: userId,
      movies: [],
      ready: false,
      sync: "syncing",
      pending: [],
    });
    listFirebaseWatchlist(userId)
      .then((movies) => {
        if (!active || ownerRef.current !== userId) return;
        setAccountState({
          ownerId: userId,
          movies,
          ready: true,
          sync: "synced",
          pending: [],
        });
      })
      .catch(() => {
        if (!active || ownerRef.current !== userId) return;
        setAccountState({
          ownerId: userId,
          movies: [],
          ready: true,
          sync: "error",
          pending: [],
        });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(getFirebaseAuth(), provider);
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    try {
      await signOut(getFirebaseAuth());
    } catch {
      setAuthError("Could not sign out. Please try again.");
    }
  }, []);

  const accountVisible = Boolean(userId && accountState.ownerId === userId);
  const movies = userId ? (accountVisible ? accountState.movies : []) : guestMovies;
  const authStatus: AuthStatus = !configReady
    ? "loading"
    : user
      ? "authenticated"
      : "unauthenticated";
  const ready =
    guestReady &&
    configReady &&
    (!userId || (accountVisible && accountState.ready));
  const syncState = userId
    ? accountVisible
      ? accountState.sync
      : "syncing"
    : "local";
  const pendingIds = accountVisible ? accountState.pending : [];

  const toggle = useCallback(
    (movie: Movie) => {
      if (!ready) return;
      if (!userId) {
        const saved = guestRef.current.some((item) => item.id === movie.id);
        const next = saved
          ? guestRef.current.filter((item) => item.id !== movie.id)
          : [movie, ...guestRef.current];
        guestRef.current = next;
        setGuestMovies(next);
        return;
      }

      const state = accountRef.current;
      if (
        state.ownerId !== userId ||
        state.pending.includes(movie.id) ||
        state.sync === "syncing"
      ) {
        return;
      }

      const saved = state.movies.some((item) => item.id === movie.id);
      const next = saved
        ? state.movies.filter((item) => item.id !== movie.id)
        : [movie, ...state.movies];
      const nextState = {
        ...state,
        movies: next,
        pending: [...state.pending, movie.id],
      };
      accountRef.current = nextState;
      setAccountState(nextState);

      const requestedOwner = userId;
      const operation = saved
        ? deleteFirebaseWatchlistMovie(userId, movie.id)
        : saveFirebaseWatchlistMovie(userId, movie);
      operation
        .then(() => {
          if (ownerRef.current === requestedOwner) {
            setAccountState((current) =>
              current.ownerId === requestedOwner
                ? { ...current, sync: "synced" }
                : current,
            );
          }
        })
        .catch(() => {
          if (ownerRef.current === requestedOwner) {
            setAccountState((current) =>
              current.ownerId === requestedOwner
                ? { ...current, sync: "error" }
                : current,
            );
          }
        })
        .finally(() => {
          if (ownerRef.current === requestedOwner) {
            setAccountState((current) =>
              current.ownerId === requestedOwner
                ? {
                    ...current,
                    pending: current.pending.filter((id) => id !== movie.id),
                  }
                : current,
            );
          }
        });
    },
    [ready, userId],
  );

  return (
    <WatchlistContext.Provider
      value={{
        movies,
        ready,
        authEnabled: firebaseConfigured,
        authStatus,
        configReady,
        user,
        authError,
        storageWarning: userId ? null : storageWarning,
        syncState,
        pendingIds,
        isSaved: (id) => movies.some((movie) => movie.id === id),
        toggle,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return <WatchlistProvider>{children}</WatchlistProvider>;
}

export function useWatchlist() {
  const value = useContext(WatchlistContext);
  if (!value) throw new Error("useWatchlist must be used within AppProviders");
  return value;
}
