import {
  useEffect,
  useState,
} from "react";

import AdminDashboard from "./AdminDashboard";
import BulletinBoard from "./BulletinBoard";
import ChatPage from "./ChatPage";
import MyConnections from "./MyConnections";
import MyProfile from "./MyProfile";
import PrivacyPage from "./PrivacyPage";
import PublicProfile from "./PublicProfile";
import SafetyCenter from "./SafetyCenter";
import VerifiedCelebration from "./VerifiedCelebration";

import {
  getCurrentUser,
  loginUser,
  markVerificationWelcomeSeen,
  registerUser,
} from "./api";

import "./App.css";


function App() {
  const [mode, setMode] =
    useState("login");

  const [showPrivacy, setShowPrivacy] =
    useState(() =>
      window.location.pathname ===
      "/privacy"
    );

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
    restoringSession,
    setRestoringSession,
  ] = useState(true);

  const [authToken, setAuthToken] =
    useState(() =>
      sessionStorage.getItem(
        "access_token"
      )
    );

  const [
    showCelebration,
    setShowCelebration,
  ] = useState(false);

  const [
    studentView,
    setStudentView,
  ] = useState("bulletin");

  const [
    selectedProfileUserId,
    setSelectedProfileUserId,
  ] = useState(null);

  const [
    selectedChat,
    setSelectedChat,
  ] = useState(null);


  useEffect(() => {
    function handlePopState() {
      setShowPrivacy(
        window.location.pathname ===
          "/privacy"
      );
    }

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);


  function openPrivacy() {
    window.history.pushState(
      {},
      "",
      "/privacy"
    );

    setShowPrivacy(true);
  }


  function closePrivacy() {
    window.history.pushState(
      {},
      "",
      "/"
    );

    setShowPrivacy(false);
  }


  useEffect(() => {
    let cancelled = false;


    async function restoreSession() {
      if (!authToken) {
        setRestoringSession(false);

        return;
      }

      try {
        const user =
          await getCurrentUser(
            authToken
          );

        if (cancelled) {
          return;
        }

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
      } catch {
        if (cancelled) {
          return;
        }

        sessionStorage.removeItem(
          "access_token"
        );

        setAuthToken(null);
        setCurrentUser(null);
      } finally {
        if (!cancelled) {
          setRestoringSession(false);
        }
      }
    }


    restoreSession();


    return () => {
      cancelled = true;
    };
  }, [authToken]);


  async function handleLogin(
    event
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const loginData =
        await loginUser(
          username,
          password
        );

      sessionStorage.setItem(
        "access_token",
        loginData.access_token
      );

      setAuthToken(
        loginData.access_token
      );

      const user =
        await getCurrentUser(
          loginData.access_token
        );

      setCurrentUser(user);

      setStudentView(
        "bulletin"
      );

      setSelectedProfileUserId(
        null
      );

      setSelectedChat(
        null
      );

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
      setMessage(
        error.message
      );
    } finally {
      setLoading(false);
    }
  }


  async function handleRegister(
    event
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const data =
        await registerUser(
          username,
          password,
          fullName,
          major
        );

      setMessage(
        data.message
      );

      setMode("login");

      setPassword("");
      setFullName("");
      setMajor("");
    } catch (error) {
      setMessage(
        error.message
      );
    } finally {
      setLoading(false);
    }
  }


  async function finishCelebration() {
    if (!authToken) {
      handleLogout();

      return;
    }

    try {
      await markVerificationWelcomeSeen(
        authToken
      );

      setCurrentUser(
        (user) => ({
          ...user,

          verification_welcome_seen:
            true,
        })
      );

      setShowCelebration(
        false
      );

      setStudentView(
        "bulletin"
      );
    } catch (error) {
      setMessage(
        error.message
      );
    }
  }


  function openProfile(
    userId
  ) {
    setSelectedProfileUserId(
      userId
    );

    setStudentView(
      "profile"
    );
  }


  function openChat(
    connection
  ) {
    setSelectedChat(
      connection
    );

    setStudentView(
      "chat"
    );
  }


  function handleLogout() {
    sessionStorage.removeItem(
      "access_token"
    );

    setAuthToken(null);
    setCurrentUser(null);

    setShowCelebration(false);

    setStudentView(
      "bulletin"
    );

    setSelectedProfileUserId(
      null
    );

    setSelectedChat(
      null
    );

    setUsername("");
    setPassword("");
    setFullName("");
    setMajor("");

    setMessage("");
    setShowPrivacy(false);
  }


  if (restoringSession) {
    return (
      <main className="page">
        <section className="welcome-card">
          <p className="small-title">
            GET CONNECTED
          </p>

          <h1>
            Loading...
          </h1>

          <p>
            Getting your account ready.
          </p>
        </section>
      </main>
    );
  }


  if (showPrivacy) {
    return (
      <PrivacyPage
        onBack={closePrivacy}
      />
    );
  }


  if (
    currentUser &&
    currentUser.role !== "admin" &&
    showCelebration
  ) {
    return (
      <VerifiedCelebration
        username={
          currentUser.username
        }
        onContinue={
          finishCelebration
        }
      />
    );
  }


  if (
    currentUser &&
    currentUser.role === "admin"
  ) {
    return (
      <AdminDashboard
        token={authToken}
        username={
          currentUser.username
        }
        onLogout={
          handleLogout
        }
      />
    );
  }


  if (currentUser) {
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

            <h1>
              You&apos;re almost there!
            </h1>

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
              onClick={
                handleLogout
              }
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
              Your account hasn&apos;t
              been rejected.
            </p>

            <p>
              We just need some additional
              information before your GMU
              verification can be
              completed.
            </p>

            <div className="status-badge">
              More Information Needed
            </div>

            <button
              className="main-button"
              type="button"
              onClick={
                handleLogout
              }
            >
              Log Out
            </button>
          </section>
        </main>
      );
    }


    if (
      studentView ===
      "my-profile"
    ) {
      return (
        <MyProfile
          token={authToken}
          currentUser={
            currentUser
          }
          onBackToBulletin={() =>
            setStudentView(
              "bulletin"
            )
          }
          onLogout={
            handleLogout
          }
        />
      );
    }


    if (
      studentView ===
      "safety-center"
    ) {
      return (
        <SafetyCenter
          token={authToken}
          onBack={() =>
            setStudentView(
              "bulletin"
            )
          }
          onLogout={
            handleLogout
          }
        />
      );
    }


    if (
      studentView === "chat" &&
      selectedChat
    ) {
      return (
        <ChatPage
          token={authToken}
          currentUser={
            currentUser
          }
          connection={
            selectedChat
          }
          onBack={() => {
            setSelectedChat(
              null
            );

            setStudentView(
              "connections"
            );
          }}
        />
      );
    }


    if (
      studentView === "profile" &&
      selectedProfileUserId
    ) {
      return (
        <PublicProfile
          token={authToken}
          userId={
            selectedProfileUserId
          }
          onBack={() => {
            setSelectedProfileUserId(
              null
            );

            setStudentView(
              "connections"
            );
          }}
        />
      );
    }


    if (
      studentView ===
      "connections"
    ) {
      return (
        <MyConnections
          token={authToken}
          onViewProfile={
            openProfile
          }
          onOpenChat={
            openChat
          }
          onBackToBulletin={() =>
            setStudentView(
              "bulletin"
            )
          }
          onLogout={
            handleLogout
          }
        />
      );
    }


    return (
      <BulletinBoard
        token={authToken}
        currentUser={
          currentUser
        }
        onOpenMyProfile={() =>
          setStudentView(
            "my-profile"
          )
        }
        onOpenConnections={() =>
          setStudentView(
            "connections"
          )
        }
        onOpenSafetyCenter={() =>
          setStudentView(
            "safety-center"
          )
        }
        onLogout={
          handleLogout
        }
      />
    );
  }


  return (
    <main className="page">
      <section className="auth-card">
        <div className="intro">
          <p className="small-title">
            GEORGE MASON UNIVERSITY
          </p>

          <h1>
            Get Connected
          </h1>

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
            onSubmit={
              handleLogin
            }
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
            onSubmit={
              handleRegister
            }
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

        <div className="site-legal-links">
          <button
            type="button"
            onClick={openPrivacy}
          >
            Privacy & Site Information
          </button>

          <p>
            Unofficial student-built
            project. Not affiliated with
            or endorsed by George Mason
            University.
          </p>
        </div>
      </section>
    </main>
  );
}


export default App;
