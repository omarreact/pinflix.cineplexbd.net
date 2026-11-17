"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, Check, Cloud, Film } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { useState } from "react";
import { useWatchlist } from "@/components/app-providers";

function signInErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "Sign-in is temporarily unavailable. Please try again.";
  }

  if (error.code === "auth/unauthorized-domain") {
    return "This site is not authorized for Google sign-in. Add its hostname in Firebase Authentication settings.";
  }
  if (error.code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled for this Firebase project yet.";
  }
  if (error.code === "auth/popup-blocked") {
    return "Your browser blocked the Google sign-in window. Allow pop-ups and try again.";
  }
  if (error.code === "auth/popup-closed-by-user") {
    return "The Google sign-in window was closed before sign-in finished.";
  }
  return "Google sign-in could not be completed. Please try again.";
}

export function SignIn({ authError }: { authError?: string }) {
  const {
    authEnabled,
    authStatus,
    configReady,
    user,
    authError: providerError,
    signInWithGoogle,
  } = useWatchlist();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    authError
      ? "We couldn’t complete sign-in. Please try again or continue with your browser watchlist."
      : null,
  );

  async function login() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (signInError) {
      setError(signInErrorMessage(signInError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container signin-page">
      <div className="signin-story">
        <p className="eyebrow">YOUR OWN LITTLE FILM CLUB</p>
        <h1>
          Good stories.
          <br />
          <em>Great company.</em>
        </h1>
        <p>
          Keep your next movie night close. Sign in to bring your watchlist
          along, wherever you discover your next favorite.
        </p>
        <ul className="signin-benefits">
          <li>
            <Bookmark size={19} /> One home for your saved films
          </li>
          <li>
            <Cloud size={19} /> Your collection across devices
          </li>
          <li>
            <Film size={19} /> More discovering. Less forgetting.
          </li>
        </ul>
      </div>
      <div className="signin-card">
        <span className="brand-symbol signin-symbol" aria-hidden="true">
          p
        </span>
        <h2>{authStatus === "authenticated" ? "You’re in." : "Welcome to Pinflix."}</h2>
        <p>
          {authStatus === "authenticated"
            ? `Signed in${user?.displayName ? ` as ${user.displayName}` : ""}. Your next great film is waiting.`
            : "A small space for your big screen dreams."}
        </p>
        {error ? (
          <p className="notice" role="alert">
            {error}
          </p>
        ) : null}
        {providerError ? (
          <p className="notice" role="alert">
            {providerError}
          </p>
        ) : null}
        {!configReady || authStatus === "loading" ? (
          <div className="loading-state" role="status">
            Checking sign-in availability…
          </div>
        ) : authStatus === "authenticated" ? (
          <Link href="/watchlist" className="button button-primary">
            <Check size={18} /> Open your watchlist
          </Link>
        ) : authEnabled ? (
          <button
            className="button google-button"
            disabled={busy}
            onClick={() => void login()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.8 12.2c0-.7-.1-1.4-.2-2.2H12v4.3h5.5a4.7 4.7 0 0 1-2 3v2.5h3.3c1.9-1.8 3-4.4 3-7.6ZM12 22c2.7 0 5-.9 6.8-2.5l-3.3-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.2H2.8v2.7A10.3 10.3 0 0 0 12 22ZM6.2 13.7a6.2 6.2 0 0 1 0-3.4V7.6H2.8a10.2 10.2 0 0 0 0 8.8l3.4-2.7ZM12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 2.8 7.6l3.4 2.7A6.1 6.1 0 0 1 12 6.1Z"
              />
            </svg>
            {busy ? "Opening Google…" : "Continue with Google"}
          </button>
        ) : (
          <div className="signin-unavailable">
            <p>
              Account sign-in isn’t available yet. Your watchlist works in this
              browser, with no account needed.
            </p>
            <Link href="/watchlist" className="button button-primary">
              Continue to your watchlist <ArrowRight size={17} />
            </Link>
          </div>
        )}
        <p className="signin-privacy">
          Your local watchlist stays in this browser. With sign-in enabled, saved
          film IDs also sync to your account.{" "}
          <Link href="/about#privacy">About your privacy</Link>.
        </p>
        <Link href="/" className="text-link">
          Keep discovering <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
