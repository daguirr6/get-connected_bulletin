import {
  useEffect,
  useState,
} from "react";

import AdminDashboard from "./AdminDashboard";
import BulletinBoard from "./BulletinBoard";
import ChatPage from "./ChatPage";
import LandingPage from "./LandingPage";
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
  replyToVerification,
  sendPresenceHeartbeat,
} from "./api";

import "./App.css";


function App() {
  const [mode, setMode] =
    useState("login");

  const [showAuth, setShowAuth] =
    useState(false);

  const [showPrivacy, setShowPrivacy] =
    useState(() =>
      window.location.pathname ===
      "/privacy"
    );

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [fullName, setFullName] =
    useState("");

  const [major, setMajor] =
    useState("");

  const [verificationReply, setVerificationReply] =
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


  function applyLocationState(
    historyState = window.history.state
  ) {
    const pathname =
      window.location.pathname;

    setShowPrivacy(false);
    setShowAuth(false);

    if (pathname === "/privacy") {
      setShowPrivacy(true);
      return;
    }

    if (pathname === "/login") {
      setMode("login");
      setShowAuth(true);
      return;
    }

    if (pathname === "/register") {
      setMode("register");
      setShowAuth(true);
      return;
    }

    setSelectedProfileUserId(null);
    setSelectedChat(null);

    if (pathname === "/connections") {
      setStudentView("connections");
      return;
    }

    if (pathname === "/my-profile") {
      setStudentView("my-profile");
      return;
    }

    if (pathname === "/safety") {
      setStudentView("safety-center");
      return;
    }

    if (pathname.startsWith("/profiles/")) {
      const userId = Number(
        pathname.split("/")[2]
      );

      if (Number.isInteger(userId)) {
        setSelectedProfileUserId(userId);
        setStudentView("profile");
        return;
      }
    }

    if (pathname.startsWith("/chats/")) {
      const savedChat =
        historyState?.selectedChat;

      if (savedChat) {
        setSelectedChat(savedChat);
        setStudentView("chat");
        return;
      }

      // A direct refresh of a chat URL does
      // not contain the connection object.
      // Connections is the safest fallback.
      setStudentView("connections");
      return;
    }

    setStudentView("bulletin");
  }


  function pushRoute(
    path,
    state = {}
  ) {
    window.history.pushState(
      state,
      "",
      path
    );

    applyLocationState(state);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }


  useEffect(() => {
    function handlePopState(
      event
    ) {
      applyLocationState(
        event.state
      );
    }

    if (!window.history.state) {
      window.history.replaceState(
        { view: "initial" },
        "",
        window.location.pathname
      );
    }

    applyLocationState(
      window.history.state
    );

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
    pushRoute(
      "/privacy",
      { view: "privacy" }
    );
  }


  function closePrivacy() {
    window.history.back();
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



  function openLoginPage() {
    setMessage("");

    pushRoute(
      "/login",
      { view: "login" }
    );
  }


  function openRegisterPage() {
    setMessage("");

    pushRoute(
      "/register",
      { view: "register" }
    );
  }


  function closeAuthPage() {
    setMessage("");
    window.history.back();
  }



  // Automatically check pending accounts
  // about every 45 seconds.
  //
  // We also check when the student
  // returns to this browser tab.
  useEffect(() => {
    if (
      !authToken ||
      !currentUser ||
      currentUser.role === "admin" ||
      currentUser.verification_status !==
        "pending"
    ) {
      return;
    }

    let cancelled = false;
    let checking = false;


    async function checkPendingVerification() {
      if (
        checking ||
        document.hidden
      ) {
        return;
      }

      checking = true;

      try {
        const user =
          await getCurrentUser(
            authToken
          );

        if (cancelled) {
          return;
        }

        setCurrentUser(user);


        if (
          user.verification_status ===
          "verified"
        ) {
          setMessage("");

          const shouldCelebrate =
            user.verification_welcome_seen ===
              false;

          setShowCelebration(
            shouldCelebrate
          );

          if (!shouldCelebrate) {
            setStudentView(
              "bulletin"
            );
          }
        }


        if (
          user.verification_status ===
          "needs_info"
        ) {
          setMessage(
            "The admin needs a little more information before your verification can be completed."
          );
        }
      } catch {
        // Background checks stay quiet.
        // The manual button will still
        // show an error if something
        // actually needs attention.
      } finally {
        checking = false;
      }
    }


    const timer =
      window.setInterval(
        checkPendingVerification,
        45000
      );


    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        checkPendingVerification();
      }
    }


    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );


    return () => {
      cancelled = true;

      window.clearInterval(
        timer
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    authToken,
    currentUser?.id,
    currentUser?.role,
    currentUser?.verification_status,
    currentUser?.verification_welcome_seen,
  ]);



  // Keep presence fresh while a verified
  // student is actively using the site.
  // If heartbeats stop, the backend
  // automatically treats them as offline.
  useEffect(() => {
    if (
      !authToken ||
      !currentUser ||
      currentUser.role === "admin" ||
      currentUser.verification_status !==
        "verified"
    ) {
      return;
    }

    let cancelled = false;

    async function heartbeat() {
      if (
        cancelled ||
        document.hidden
      ) {
        return;
      }

      try {
        await sendPresenceHeartbeat(
          authToken
        );
      } catch {
        // Presence should never interrupt
        // the rest of the site.
      }
    }

    heartbeat();

    const timer =
      window.setInterval(
        heartbeat,
        25000
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        heartbeat();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      cancelled = true;

      window.clearInterval(
        timer
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    authToken,
    currentUser?.id,
    currentUser?.role,
    currentUser?.verification_status,
  ]);



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
      setShowAuth(false);
      setShowPrivacy(false);

      window.history.replaceState(
        { view: "bulletin" },
        "",
        "/bulletin"
      );

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

    if (password !== confirmPassword) {
      setMessage(
        "Passwords do not match. Please try again."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await registerUser(
        username,
        password,
        fullName,
        major
      );

      setMessage(
        "Account created! Student verification is done manually. " +
        "An admin checks the legal name and major you submitted. " +
        "During active hours this may take only a few minutes; " +
        "if you sign up late at night or while the admin is unavailable, " +
        "it may take longer. You can log in immediately to check your status. " +
        "No email address, Mason password, or Duo code is required."
      );

      setMode("login");

      setPassword("");
      setConfirmPassword("");
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


  async function submitVerificationReply(
    event
  ) {
    event.preventDefault();

    if (!verificationReply.trim()) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await replyToVerification(
        authToken,
        verificationReply.trim()
      );

      setVerificationReply("");

      setCurrentUser(
        await getCurrentUser(
          authToken
        )
      );

      setMessage(
        "Your response has been sent to the admin for review."
      );
    } catch (error) {
      setMessage(
        error.message
      );
    } finally {
      setLoading(false);
    }
  }


  async function refreshVerificationStatus() {
    if (!authToken) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const user =
        await getCurrentUser(
          authToken
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

      if (
        user.verification_status ===
        "pending"
      ) {
        setMessage(
          "Your verification is still pending. " +
          "An admin will manually check your name and major. " +
          "Please check again in a little while."
        );
      }

      if (
        user.verification_status ===
        "needs_info"
      ) {
        setMessage(
          "The admin needs a little more information before your verification can be completed."
        );
      }
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

      window.history.replaceState(
        { view: "bulletin" },
        "",
        "/bulletin"
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
    pushRoute(
      `/profiles/${userId}`,
      {
        view: "profile",
        selectedProfileUserId:
          userId,
      }
    );
  }


  function openChat(
    connection
  ) {
    pushRoute(
      `/chats/${connection.id}`,
      {
        view: "chat",
        selectedChat:
          connection,
      }
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
    setConfirmPassword("");
    setFullName("");
    setMajor("");

    setMessage("");
    setShowPrivacy(false);
    setShowAuth(false);

    window.history.replaceState(
      { view: "landing" },
      "",
      "/"
    );
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
              successfully!
            </p>

            <p>
              Verification is completed
              manually by the Get Connected
              admin using the legal name and
              major you submitted.
            </p>

            <p>
              During active hours this may
              take only a few minutes. If
              you signed up late at night
              or while the admin is
              unavailable, it may take
              longer.
            </p>

            <p>
              You can leave this page open
              while your account is waiting
              for review.
            </p>

            <p className="privacy-note">
              <strong>
                Automatic status check:
              </strong>{" "}
              Get Connected checks your
              verification status about
              every 45 seconds while this
              page is open, and again when
              you return to this tab.
              You can also check manually
              below.
            </p>

            <p className="privacy-note">
              Get Connected does not need
              your GMU email, personal
              email, Mason password, Duo
              code, or any other university
              login credentials for
              verification.
            </p>

            <div className="status-badge">
              Verification Pending
            </div>

            <button
              className="main-button"
              type="button"
              disabled={loading}
              onClick={
                refreshVerificationStatus
              }
            >
              {loading
                ? "Checking..."
                : "Check Verification Status"}
            </button>

            <button
              className="sound-button"
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

            <p>
              <strong>
                Message from the admin:
              </strong>
            </p>

            <p>
              {
                currentUser.verification_admin_note ||
                "Please provide the additional details requested by the admin."
              }
            </p>

            <form
              onSubmit={
                submitVerificationReply
              }
              style={{
                width: "100%",
              }}
            >
              <label htmlFor="verification-reply">
                Your response
              </label>

              <textarea
                id="verification-reply"
                rows={5}
                maxLength={2000}
                required
                value={verificationReply}
                onChange={(event) =>
                  setVerificationReply(
                    event.target.value
                  )
                }
                placeholder="Explain or correct your student information here. Never share passwords or Duo codes."
                style={{
                  width: "100%",
                  margin: "12px 0",
                  padding: "10px",
                }}
              />

              <button
                className="main-button"
                type="submit"
                disabled={
                  loading ||
                  !verificationReply.trim()
                }
              >
                {loading
                  ? "Submitting..."
                  : "Send Information"}
              </button>
            </form>

            {message && (
              <p role="status">
                {message}
              </p>
            )}

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
            window.history.back()
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
            window.history.back()
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
          onBack={() =>
            window.history.back()
          }
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
          onBack={() =>
            window.history.back()
          }
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
            window.history.back()
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
          pushRoute(
            "/my-profile",
            { view: "my-profile" }
          )
        }
        onOpenConnections={() =>
          pushRoute(
            "/connections",
            { view: "connections" }
          )
        }
        onOpenSafetyCenter={() =>
          pushRoute(
            "/safety",
            { view: "safety-center" }
          )
        }
        onLogout={
          handleLogout
        }
      />
    );
  }


  if (!showAuth) {
    return (
      <LandingPage
        onLogin={openLoginPage}
        onCreateAccount={
          openRegisterPage
        }
        onPrivacy={openPrivacy}
      />
    );
  }


  return (
    <main className="page">
      <section className="auth-card">
        <button
          className="auth-home-button"
          type="button"
          onClick={closeAuthPage}
        >
          ← Back to Home
        </button>

        <div className="intro">
          <p className="small-title">
            A STUDENT-BUILT MASON COMMUNITY
          </p>

          <h1>
            Get Connected
          </h1>

          <p className="description">
            Meet students, discover shared
            interests, and connect with people
            around campus you might never have
            met otherwise.
          </p>

          <p className="privacy-note">
            <strong>
              Unofficial student project.
            </strong>{" "}
            Get Connected is not affiliated
            with or endorsed by George Mason
            University.
          </p>

          <p className="privacy-note">
            <strong>
              Independent login:
            </strong>{" "}
            Get Connected uses its own
            username and password system.
            Never enter your Mason password,
            Duo code, or other university
            login credentials here.
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
              Get Connected username

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
              Get Connected password

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
              Get Connected username

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
              Get Connected password

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
              Type password again

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
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
              <strong>
                Student verification:
              </strong>{" "}
              We only ask for your full legal
              name and major during student
              verification. Your legal name
              stays private and is never shown
              to other students. Your major is
              shown only to other verified
              Get Connected students after
              approval.
              <br />
              <br />
              You do not need to provide a
              GMU email address, personal
              email address, Mason password,
              Duo code, or any other
              university login credentials.
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