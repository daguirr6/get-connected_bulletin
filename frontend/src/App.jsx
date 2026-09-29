import { useState } from "react";

import {
  getCurrentUser,
  loginUser,
  markVerificationWelcomeSeen,
  registerUser,
} from "./api";

import VerifiedCelebration from "./VerifiedCelebration";

import "./App.css";


function App() {
  const [mode, setMode] = useState("login");

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [fullName, setFullName] =
    useState("");

  const [major, setMajor] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [
    showCelebration,
    setShowCelebration,
  ] = useState(false);


  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const loginData = await loginUser(
        username,
        password
      );

      localStorage.setItem(
        "access_token",
        loginData.access_token
      );

      const user = await getCurrentUser(
        loginData.access_token
      );

      setCurrentUser(user);

      const shouldCelebrate =
        user.role !== "admin" &&
        user.verification_status ===
          "verified" &&
        user.verification_welcome_seen ===
          false;

      setShowCelebration(
        shouldCelebrate
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }


  async function handleRegister(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const data = await registerUser(
        username,
        password,
        fullName,
        major
      );

      setMessage(data.message);

      setMode("login");

      setPassword("");
      setFullName("");
      setMajor("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }


  async function finishCelebration() {
    const token = localStorage.getItem(
      "access_token"
    );

    if (!token) {
      setMessage(
        "Your login has expired. Please log in again."
      );

      setCurrentUser(null);
      setShowCelebration(false);

      return;
    }

    try {
      await markVerificationWelcomeSeen(
        token
      );

      setCurrentUser((user) => ({
        ...user,
        verification_welcome_seen: true,
      }));

      setShowCelebration(false);
    } catch (error) {
      setMessage(error.message);
    }
  }


  function handleLogout() {
    localStorage.removeItem(
      "access_token"
    );

    setCurrentUser(null);
    setShowCelebration(false);

    setUsername("");
    setPassword("");
    setFullName("");
    setMajor("");

    setMessage("");
  }


  if (
    currentUser &&
    currentUser.role !== "admin" &&
    showCelebration
  ) {
    return (
      <VerifiedCelebration
        username={currentUser.username}
        onContinue={finishCelebration}
      />
    );
  }


  if (currentUser) {
    if (currentUser.role === "admin") {
      return (
        <main className="page">
          <section className="welcome-card">
            <p className="small-title">
              GET CONNECTED
            </p>

            <h1>Admin Account</h1>

            <p>
              Welcome,{" "}
              <strong>
                {currentUser.username}
              </strong>
              !
            </p>

            <p>
              Your administrator account is
              verified and ready.
            </p>

            <button
              className="main-button"
              type="button"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </section>
        </main>
      );
    }


    if (
      currentUser.verification_status ===
      "pending"
    ) {
      return (
        <main className="page">
          <section className="welcome-card">
            <p className="small-title">
              GET CONNECTED
            </p>

            <h1>You&apos;re almost there!</h1>

            <p>
              Your account was created
              successfully.
            </p>

            <p>
              Your student information is
              currently waiting for
              verification.
            </p>

            <div className="status-badge">
              Verification Pending
            </div>

            <button
              className="main-button"
              type="button"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </section>
        </main>
      );
    }


    if (
      currentUser.verification_status ===
      "needs_info"
    ) {
      return (
        <main className="page">
          <section className="welcome-card">
            <p className="small-title">
              GET CONNECTED
            </p>

            <h1>
              We need a little more
              information
            </h1>

            <p>
              Your verification needs
              additional information before
              your account can be approved.
            </p>

            <button
              className="main-button"
              type="button"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </section>
        </main>
      );
    }


    return (
      <main className="page">
        <section className="welcome-card">
          <p className="small-title">
            GET CONNECTED
          </p>

          <h1>The Bulletin</h1>

          <p>
            Welcome,{" "}
            <strong>
              {currentUser.username}
            </strong>
            !
          </p>

          <p>
            You&apos;re verified and ready
            to Get Connected.
          </p>

          <p className="bulletin-note">
            We&apos;ll build the actual
            bulletin board here next.
          </p>

          <button
            className="main-button"
            type="button"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </section>
      </main>
    );
  }


  return (
    <main className="page">
      <section className="auth-card">
        <div className="intro">
          <p className="small-title">
            GEORGE MASON UNIVERSITY
          </p>

          <h1>Get Connected</h1>

          <p className="description">
            Meet students. Share a little
            about yourself. Find people
            around campus you might never
            have met otherwise.
          </p>
        </div>

        <div className="tabs">
          <button
            className={
              mode === "login"
                ? "tab active"
                : "tab"
            }
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Log In
          </button>

          <button
            className={
              mode === "register"
                ? "tab active"
                : "tab"
            }
            type="button"
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
          >
            Create Account
          </button>
        </div>

        {mode === "login" ? (
          <form
            className="auth-form"
            onSubmit={handleLogin}
          >
            <label>
              Username

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Password

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                required
              />
            </label>

            <button
              className="main-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Log In"}
            </button>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={handleRegister}
          >
            <label>
              Username

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Password

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Full legal name

              <input
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Major

              <input
                type="text"
                value={major}
                onChange={(event) =>
                  setMajor(
                    event.target.value
                  )
                }
                required
              />
            </label>

            <p className="privacy-note">
              Your legal name is only used
              for GMU verification and
              won&apos;t be shown on your
              public profile. Your safety
              and privacy will always be
              one of our highest
              priorities!
            </p>

            <button
              className="main-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Account"}
            </button>
          </form>
        )}

        {message && (
          <p className="message">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}


export default App;