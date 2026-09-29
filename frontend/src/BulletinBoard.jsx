import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createConnection,
  createPostIt,
  getConnections,
  getMyPostIt,
  getPostIts,
  updateMyPostIt,
} from "./api";


const stickyClasses = [
  "sticky-yellow",
  "sticky-pink",
  "sticky-blue",
  "sticky-green",
  "sticky-orange",
];


function BulletinBoard({
  token,
  currentUser,
  onOpenConnections,
  onLogout,
}) {
  const [postIts, setPostIts] =
    useState([]);

  const [myPostIt, setMyPostIt] =
    useState(null);

  const [connections, setConnections] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    connectingUserId,
    setConnectingUserId,
  ] = useState(null);

  const [displayName, setDisplayName] =
    useState("");

  const [funFacts, setFunFacts] =
    useState("");

  const [songTitle, setSongTitle] =
    useState("");

  const [songArtist, setSongArtist] =
    useState("");


  const connectedUserIds = useMemo(
    () =>
      new Set(
        connections.map(
          (connection) =>
            connection.user_id
        )
      ),
    [connections]
  );


  const loadBulletin = useCallback(
    async () => {
      setLoading(true);
      setMessage("");

      try {
        const [
          boardData,
          myPostData,
          connectionData,
        ] = await Promise.all([
          getPostIts(token),
          getMyPostIt(token),
          getConnections(token),
        ]);

        setPostIts(boardData);
        setMyPostIt(myPostData);
        setConnections(connectionData);

        if (myPostData) {
          setDisplayName(
            myPostData.display_name
          );

          setFunFacts(
            myPostData.fun_facts
          );

          setSongTitle(
            myPostData.song_title
          );

          setSongArtist(
            myPostData.song_artist || ""
          );
        }
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );


  useEffect(() => {
    loadBulletin();
  }, [loadBulletin]);


  function openCreateForm() {
    setDisplayName("");
    setFunFacts("");
    setSongTitle("");
    setSongArtist("");

    setShowForm(true);
    setMessage("");
  }


  function openEditForm() {
    if (!myPostIt) {
      return;
    }

    setDisplayName(
      myPostIt.display_name
    );

    setFunFacts(
      myPostIt.fun_facts
    );

    setSongTitle(
      myPostIt.song_title
    );

    setSongArtist(
      myPostIt.song_artist || ""
    );

    setShowForm(true);
    setMessage("");
  }


  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    const postData = {
      display_name:
        displayName.trim(),

      fun_facts:
        funFacts.trim(),

      song_title:
        songTitle.trim(),

      song_artist:
        songArtist.trim() || null,
    };

    try {
      if (myPostIt) {
        await updateMyPostIt(
          token,
          postData
        );

        setMessage(
          "Your Post-it was updated!"
        );
      } else {
        await createPostIt(
          token,
          postData
        );

        setMessage(
          "Your Post-it is on the board!"
        );
      }

      setShowForm(false);

      await loadBulletin();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }


  async function handleConnect(postIt) {
    if (!myPostIt) {
      setMessage(
        "Create your own Post-it before connecting with other students."
      );

      return;
    }

    if (
      connectedUserIds.has(
        postIt.user_id
      )
    ) {
      return;
    }

    setConnectingUserId(
      postIt.user_id
    );

    setMessage("");

    try {
      await createConnection(
        token,
        postIt.user_id
      );

      setMessage(
        `You and ${postIt.display_name} are now connected!`
      );

      await loadBulletin();
    } catch (error) {
      if (
        error.message ===
        "You are already connected"
      ) {
        await loadBulletin();

        setMessage(
          `You are already connected with ${postIt.display_name}.`
        );
      } else {
        setMessage(
          error.message
        );
      }
    } finally {
      setConnectingUserId(null);
    }
  }


  function safetyLabel(postIt) {
    if (
      !postIt.moderation ||
      postIt.moderation.level ===
        "none"
    ) {
      return null;
    }

    if (
      postIt.moderation.level ===
      "yellow"
    ) {
      return (
        <div className="safety-notice safety-yellow">
          Safety notice
        </div>
      );
    }

    if (
      postIt.moderation.level ===
      "red"
    ) {
      return (
        <div className="safety-notice safety-red">
          Safety notice
        </div>
      );
    }

    return null;
  }


  return (
    <main className="bulletin-page">
      <header className="bulletin-header">
        <div>
          <p className="small-title">
            GEORGE MASON UNIVERSITY
          </p>

          <h1>Get Connected</h1>

          <p>
            Welcome to the campus bulletin.
          </p>
        </div>

        <div className="bulletin-header-actions">
          <button
            className="header-button"
            type="button"
            onClick={onOpenConnections}
          >
            My Connections (
            {connections.length})
          </button>

          {myPostIt ? (
            <button
              className="header-button"
              type="button"
              onClick={openEditForm}
            >
              Edit My Post-it
            </button>
          ) : (
            <button
              className="header-button gold"
              type="button"
              onClick={openCreateForm}
            >
              Create My Post-it
            </button>
          )}

          <button
            className="header-button secondary"
            type="button"
            onClick={onLogout}
          >
            Log Out
          </button>
        </div>
      </header>


      {message && (
        <div className="bulletin-message">
          {message}
        </div>
      )}


      {!myPostIt && !loading && (
        <section className="first-post-banner">
          <div>
            <p className="small-title">
              YOUR TURN
            </p>

            <h2>
              Pin yourself to the board!
            </h2>

            <p>
              Make your Post-it before
              connecting with other
              students.
            </p>
          </div>

          <button
            className="main-button compact-button"
            type="button"
            onClick={openCreateForm}
          >
            Create My Post-it
          </button>
        </section>
      )}


      <section className="corkboard">
        <div className="board-title">
          <span className="push-pin">
          </span>

          <div>
            <h2>Campus Bulletin</h2>

            <p>
              A little glimpse of the
              people around you.
            </p>
          </div>
        </div>


        {loading ? (
          <div className="board-empty">
            Loading the bulletin...
          </div>
        ) : postIts.length === 0 ? (
          <div className="board-empty">
            <h3>
              The board is waiting for
              its first Post-it.
            </h3>

            <p>
              Be the first student to
              pin something up!
            </p>
          </div>
        ) : (
          <div className="post-it-grid">
            {postIts.map(
              (postIt, index) => {
                const isMine =
                  postIt.user_id ===
                  currentUser.id;

                const isConnected =
                  connectedUserIds.has(
                    postIt.user_id
                  );

                const isConnecting =
                  connectingUserId ===
                  postIt.user_id;

                const stickyClass =
                  stickyClasses[
                    index %
                    stickyClasses.length
                  ];

                let connectText =
                  "Get Connected!";

                if (!myPostIt) {
                  connectText =
                    "Create your Post-it first";
                } else if (
                  isConnecting
                ) {
                  connectText =
                    "Connecting...";
                } else if (
                  isConnected
                ) {
                  connectText =
                    "✓ Connected";
                }


                return (
                  <article
                    className={
                      `student-post-it ${stickyClass} ` +
                      `tilt-${index % 5} ` +
                      (
                        postIt.moderation
                          ?.level === "yellow"
                          ? "moderation-yellow"
                          : ""
                      ) +
                      " " +
                      (
                        postIt.moderation
                          ?.level === "red"
                          ? "moderation-red"
                          : ""
                      )
                    }
                    key={postIt.id}
                  >
                    <span className="post-pin">
                    </span>

                    {isMine && (
                      <span className="your-post-badge">
                        Your Post-it
                      </span>
                    )}

                    {safetyLabel(postIt)}

                    <h3>
                      {postIt.display_name}
                    </h3>

                    <p className="post-major">
                      {postIt.major}
                    </p>

                    <div className="post-divider">
                    </div>

                    <p className="post-facts">
                      {postIt.fun_facts}
                    </p>

                    <div className="post-song">
                      <span className="music-note">
                        ♪
                      </span>

                      <div>
                        <strong>
                          {postIt.song_title}
                        </strong>

                        {postIt.song_artist && (
                          <span>
                            {
                              postIt.song_artist
                            }
                          </span>
                        )}
                      </div>
                    </div>


                    {!isMine && (
                      <button
                        className={
                          isConnected
                            ? "connect-preview-button"
                            : "edit-note-button"
                        }
                        type="button"
                        disabled={
                          !myPostIt ||
                          isConnected ||
                          isConnecting
                        }
                        onClick={() =>
                          handleConnect(
                            postIt
                          )
                        }
                      >
                        {connectText}
                      </button>
                    )}


                    {isMine && (
                      <button
                        className="edit-note-button"
                        type="button"
                        onClick={
                          openEditForm
                        }
                      >
                        Edit
                      </button>
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>


      {showForm && (
        <div className="post-modal-backdrop">
          <section className="post-modal">
            <button
              className="modal-close"
              type="button"
              onClick={() =>
                setShowForm(false)
              }
              aria-label="Close"
            >
              ×
            </button>

            <p className="small-title">
              {myPostIt
                ? "EDIT YOUR POST-IT"
                : "ADD YOURSELF TO THE BOARD"}
            </p>

            <h2>
              {myPostIt
                ? "Update your Post-it"
                : "Create your Post-it"}
            </h2>

            <form
              className="post-form"
              onSubmit={handleSubmit}
            >
              <label>
                Display name

                <input
                  type="text"
                  maxLength="80"
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Fun facts

                <textarea
                  rows="5"
                  maxLength="1000"
                  value={funFacts}
                  onChange={(event) =>
                    setFunFacts(
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                A song that represents you

                <input
                  type="text"
                  maxLength="150"
                  value={songTitle}
                  onChange={(event) =>
                    setSongTitle(
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Artist

                <span className="optional-label">
                  optional
                </span>

                <input
                  type="text"
                  maxLength="150"
                  value={songArtist}
                  onChange={(event) =>
                    setSongArtist(
                      event.target.value
                    )
                  }
                />
              </label>

              <p className="post-form-note">
                Your major comes from your
                verified student information,
                so you don&apos;t need to
                enter it again.
              </p>

              <button
                className="main-button"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Pinning..."
                  : myPostIt
                    ? "Save Changes"
                    : "Pin My Post-it"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


export default BulletinBoard;