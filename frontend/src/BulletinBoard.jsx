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

import {
  deleteMyPostIt,
} from "./postItActions";

import "./BulletinBoard.css";


const PAGE_SIZE = 25;
const DESKTOP_COLUMNS = 5;


const postItColors = [
  {
    value: "yellow",
    label: "Yellow",
  },
  {
    value: "lime",
    label: "Lime",
  },
  {
    value: "sky",
    label: "Sky Blue",
  },
  {
    value: "pink",
    label: "Pink",
  },
  {
    value: "purple",
    label: "Purple",
  },
  {
    value: "peach",
    label: "Peach",
  },
  {
    value: "mint",
    label: "Mint",
  },
];


function hashString(value) {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(index);

    hash = Math.imul(
      hash,
      16777619
    );
  }

  return hash >>> 0;
}


function createRandom(seed) {
  let value = seed >>> 0;

  return function random() {
    value += 0x6d2b79f5;

    let result = value;

    result = Math.imul(
      result ^ (result >>> 15),
      result | 1
    );

    result ^=
      result +
      Math.imul(
        result ^ (result >>> 7),
        result | 61
      );

    return (
      (
        result ^
        (result >>> 14)
      ) >>> 0
    ) / 4294967296;
  };
}


function shuffleWithSeed(
  items,
  seed
) {
  const shuffled = [
    ...items,
  ];

  const random =
    createRandom(seed);

  for (
    let index =
      shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        random() *
          (index + 1)
      );

    [
      shuffled[index],
      shuffled[randomIndex],
    ] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}


function getBoardSeed(
  token
) {
  const tokenHash =
    String(
      hashString(token || "")
    );

  const savedTokenHash =
    sessionStorage.getItem(
      "get_connected_board_token"
    );

  const savedSeed =
    sessionStorage.getItem(
      "get_connected_board_seed"
    );

  if (
    savedTokenHash === tokenHash &&
    savedSeed
  ) {
    return Number(savedSeed);
  }

  const newSeed =
    Math.floor(
      Math.random() *
        2147483647
    );

  sessionStorage.setItem(
    "get_connected_board_token",
    tokenHash
  );

  sessionStorage.setItem(
    "get_connected_board_seed",
    String(newSeed)
  );

  return newSeed;
}


function createPlacements(
  count,
  rows,
  seed
) {
  const slotCount =
    rows *
    DESKTOP_COLUMNS;

  const slots =
    Array.from(
      {
        length: slotCount,
      },
      (_, index) => index
    );

  const shuffledSlots =
    shuffleWithSeed(
      slots,
      seed
    );

  return Array.from(
    {
      length: count,
    },
    (_, index) => {
      const slot =
        shuffledSlots[index];

      const column =
        slot %
        DESKTOP_COLUMNS;

      const row =
        Math.floor(
          slot /
          DESKTOP_COLUMNS
        );

      const random =
        createRandom(
          seed +
          index * 104729
        );

      const horizontalJitter =
        Math.round(
          random() * 14 - 7
        );

      const verticalJitter =
        Math.round(
          random() * 24 - 12
        );

      const rotation =
        (
          random() * 5 - 2.5
        ).toFixed(2);

      const zIndex =
        1 +
        Math.floor(
          random() * 3
        );

      return {
        left:
          column * 20 + 1.5,

        top:
          row * 232 +
          18 +
          verticalJitter,

        horizontalJitter,

        rotation,

        zIndex,
      };
    }
  );
}


function BulletinBoard({
  token,
  currentUser,
  onOpenMyProfile,
  onOpenConnections,
  onOpenSafetyCenter,
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
    removingPost,
    setRemovingPost,
  ] = useState(false);

  const [
    connectingUserId,
    setConnectingUserId,
  ] = useState(null);

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    displayName,
    setDisplayName,
  ] = useState("");

  const [
    funFacts,
    setFunFacts,
  ] = useState("");

  const [
    songTitle,
    setSongTitle,
  ] = useState("");

  const [
    songArtist,
    setSongArtist,
  ] = useState("");

  const [
    color,
    setColor,
  ] = useState("yellow");


  const boardSeed =
    useMemo(
      () =>
        getBoardSeed(token),
      [token]
    );


  const connectedUserIds =
    useMemo(
      () =>
        new Set(
          connections.map(
            (connection) =>
              connection.user_id
          )
        ),
      [connections]
    );


  const shuffledPostIts =
    useMemo(
      () =>
        shuffleWithSeed(
          postIts,
          boardSeed
        ),
      [
        postIts,
        boardSeed,
      ]
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        shuffledPostIts.length /
          PAGE_SIZE
      )
    );


  const visiblePostIts =
    useMemo(
      () => {
        const start =
          (currentPage - 1) *
          PAGE_SIZE;

        return shuffledPostIts.slice(
          start,
          start +
            PAGE_SIZE
        );
      },
      [
        shuffledPostIts,
        currentPage,
      ]
    );


  const layoutRows =
    Math.max(
      2,
      Math.ceil(
        Math.max(
          visiblePostIts.length,
          1
        ) /
          DESKTOP_COLUMNS
      )
    );


  const placements =
    useMemo(
      () =>
        createPlacements(
          visiblePostIts.length,
          layoutRows,
          boardSeed +
            currentPage *
              7919
        ),
      [
        visiblePostIts.length,
        layoutRows,
        boardSeed,
        currentPage,
      ]
    );


  const boardStageHeight =
    layoutRows *
      232 +
    45;


  const loadBulletin =
    useCallback(
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

          setPostIts(
            boardData
          );

          setMyPostIt(
            myPostData
          );

          setConnections(
            connectionData
          );

          if (myPostData) {
            setDisplayName(
              myPostData
                .display_name
            );

            setFunFacts(
              myPostData
                .fun_facts
            );

            setSongTitle(
              myPostData
                .song_title
            );

            setSongArtist(
              myPostData
                .song_artist ||
                ""
            );

            setColor(
              myPostData.color ||
                "yellow"
            );
          }
        } catch (error) {
          setMessage(
            error.message
          );
        } finally {
          setLoading(false);
        }
      },
      [token]
    );


  useEffect(() => {
    loadBulletin();
  }, [loadBulletin]);


  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);


  function openCreateForm() {
    setDisplayName("");
    setFunFacts("");
    setSongTitle("");
    setSongArtist("");
    setColor("yellow");

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
      myPostIt.song_artist ||
        ""
    );

    setColor(
      myPostIt.color ||
        "yellow"
    );

    setShowForm(true);
    setMessage("");
  }


  async function handleSubmit(
    event
  ) {
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
        songArtist.trim() ||
        null,

      color,
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
      setMessage(
        error.message
      );
    } finally {
      setSaving(false);
    }
  }


  async function handleRemovePostIt() {
    if (!myPostIt) {
      return;
    }

    const confirmed =
      window.confirm(
        "Remove your Post-it from the bulletin?\n\n" +
        "Your Get Connected account will remain active. " +
        "You can create another Post-it later."
      );

    if (!confirmed) {
      return;
    }

    setRemovingPost(true);
    setMessage("");

    try {
      await deleteMyPostIt(
        token
      );

      setShowForm(false);
      setMyPostIt(null);

      setDisplayName("");
      setFunFacts("");
      setSongTitle("");
      setSongArtist("");
      setColor("yellow");

      await loadBulletin();

      setMessage(
        "Your Post-it was removed from the bulletin."
      );
    } catch (error) {
      setMessage(
        error.message
      );
    } finally {
      setRemovingPost(false);
    }
  }


  async function handleConnect(
    postIt
  ) {
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
      setConnectingUserId(
        null
      );
    }
  }


  function safetyLabel(
    postIt
  ) {
    if (
      !postIt.moderation ||
      postIt.moderation
        .level === "none"
    ) {
      return null;
    }

    if (
      postIt.moderation
        .level === "yellow"
    ) {
      return (
        <div className="safety-notice safety-yellow">
          Safety notice
        </div>
      );
    }

    if (
      postIt.moderation
        .level === "red"
    ) {
      return (
        <div className="safety-notice safety-red">
          Safety notice
        </div>
      );
    }

    return null;
  }


  function goToPage(
    page
  ) {
    const nextPage =
      Math.min(
        totalPages,
        Math.max(
          1,
          page
        )
      );

    setCurrentPage(
      nextPage
    );

    window.setTimeout(
      () => {
        document
          .querySelector(
            ".corkboard"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      },
      30
    );
  }


  return (
    <main className="bulletin-page">
      <header className="bulletin-hero">
        <div className="bulletin-hero-title-group">
          <p className="small-title">
            GEORGE MASON UNIVERSITY
          </p>

          <h1>
            Get Connected
          </h1>

          <p className="bulletin-subtitle">
            Campus Bulletin
          </p>
        </div>


        <nav className="bulletin-main-nav">
          <button
            className="bulletin-nav-item active"
            type="button"
            disabled
          >
            Bulletin
          </button>

          <button
            className="bulletin-nav-item"
            type="button"
            onClick={
              onOpenConnections
            }
          >
            Connections (
            {connections.length})
          </button>

          <button
            className="bulletin-nav-item"
            type="button"
            onClick={
              onOpenMyProfile
            }
          >
            My Profile
          </button>

          <button
            className="bulletin-nav-item"
            type="button"
            onClick={
              onOpenSafetyCenter
            }
          >
            Safety & Appeals
          </button>

          <button
            className="bulletin-nav-item"
            type="button"
            onClick={
              myPostIt
                ? openEditForm
                : openCreateForm
            }
          >
            {myPostIt
              ? "Edit Post-it"
              : "Create Post-it"}
          </button>

          <button
            className="bulletin-nav-item logout"
            type="button"
            onClick={onLogout}
          >
            Log Out
          </button>
        </nav>
      </header>


      {message && (
        <div className="bulletin-message">
          {message}
        </div>
      )}


      {!myPostIt &&
        !loading && (
          <section className="first-post-banner">
            <div>
              <p className="small-title">
                YOUR TURN
              </p>

              <h2>
                Pin yourself to the
                board!
              </h2>

              <p>
                Make your Post-it
                before connecting with
                other students.
              </p>
            </div>

            <button
              className="main-button compact-button"
              type="button"
              onClick={
                openCreateForm
              }
            >
              Create My Post-it
            </button>
          </section>
        )}


      <section className="corkboard">
        <div className="bulletin-board-top">
          <div className="board-paper-label">
            <span className="push-pin">
            </span>

            <div>
              <strong>
                Campus Bulletin
              </strong>

              <span>
                {shuffledPostIts.length}{" "}
                student
                {shuffledPostIts.length ===
                1
                  ? ""
                  : "s"}{" "}
                pinned up
              </span>
            </div>
          </div>
        </div>


        {loading ? (
          <div className="board-empty">
            Loading the bulletin...
          </div>
        ) : shuffledPostIts.length ===
          0 ? (
          <div className="board-empty">
            <h3>
              The board is waiting
              for its first Post-it.
            </h3>

            <p>
              Be the first student
              to pin something up!
            </p>
          </div>
        ) : (
          <>
            <div
              className="post-it-stage"
              style={{
                "--board-stage-height":
                  `${boardStageHeight}px`,
              }}
            >
              {visiblePostIts.map(
                (
                  postIt,
                  index
                ) => {
                  const placement =
                    placements[index];

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

                  let connectText =
                    "Get Connected!";

                  if (!myPostIt) {
                    connectText =
                      "Create yours first";
                  } else if (
                    isConnecting
                  ) {
                    connectText =
                      "Connecting...";
                  } else if (
                    isConnected
                  ) {
                    connectText =
                      "Connected";
                  }

                  const noteColor =
                    postIt.color ||
                    "yellow";


                  return (
                    <article
                      className={
                        `student-post-it ` +
                        `post-color-${noteColor} ` +
                        (
                          postIt
                            .moderation
                            ?.level ===
                          "yellow"
                            ? "moderation-yellow "
                            : ""
                        ) +
                        (
                          postIt
                            .moderation
                            ?.level ===
                          "red"
                            ? "moderation-red"
                            : ""
                        )
                      }
                      key={
                        postIt.id
                      }
                      style={{
                        "--note-left":
                          `calc(${placement.left}% + ${placement.horizontalJitter}px)`,

                        "--note-top":
                          `${placement.top}px`,

                        "--note-rotation":
                          `${placement.rotation}deg`,

                        "--note-z":
                          placement.zIndex,
                      }}
                    >
                      <span className="post-pin">
                      </span>

                      {isMine && (
                        <span className="your-post-badge">
                          Yours
                        </span>
                      )}

                      {safetyLabel(
                        postIt
                      )}

                      <h3>
                        {
                          postIt
                            .display_name
                        }
                      </h3>

                      <p className="post-major">
                        {
                          postIt.major
                        }
                      </p>

                      <div className="post-divider">
                      </div>

                      <p className="post-facts">
                        {
                          postIt
                            .fun_facts
                        }
                      </p>

                      <div className="post-song">
                        <span className="music-note">
                          ♪
                        </span>

                        <div>
                          <strong>
                            {
                              postIt
                                .song_title
                            }
                          </strong>

                          {postIt
                            .song_artist && (
                            <span>
                              {
                                postIt
                                  .song_artist
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
                          {
                            connectText
                          }
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


            <div className="bulletin-pagination">
              <button
                type="button"
                disabled={
                  currentPage === 1
                }
                onClick={() =>
                  goToPage(
                    currentPage - 1
                  )
                }
              >
                ← Previous
              </button>

              <div className="page-count">
                <strong>
                  Page{" "}
                  {currentPage}
                </strong>

                <span>
                  of {totalPages}
                </span>
              </div>

              <button
                type="button"
                disabled={
                  currentPage ===
                  totalPages
                }
                onClick={() =>
                  goToPage(
                    currentPage + 1
                  )
                }
              >
                Next →
              </button>
            </div>

            <p className="shuffle-note">
              The bulletin reshuffles
              each time you sign in.
            </p>
          </>
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
              className="post-form post-form-with-preview"
              onSubmit={
                handleSubmit
              }
            >
              <div className="post-form-fields">
                <label>
                  Display name

                  <input
                    type="text"
                    maxLength="80"
                    value={
                      displayName
                    }
                    onChange={(
                      event
                    ) =>
                      setDisplayName(
                        event
                          .target
                          .value
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
                    value={
                      funFacts
                    }
                    onChange={(
                      event
                    ) =>
                      setFunFacts(
                        event
                          .target
                          .value
                      )
                    }
                    required
                  />
                </label>

                <label>
                  A song that
                  represents you

                  <input
                    type="text"
                    maxLength="150"
                    value={
                      songTitle
                    }
                    onChange={(
                      event
                    ) =>
                      setSongTitle(
                        event
                          .target
                          .value
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
                    value={
                      songArtist
                    }
                    onChange={(
                      event
                    ) =>
                      setSongArtist(
                        event
                          .target
                          .value
                      )
                    }
                  />
                </label>


                <fieldset className="post-color-picker">
                  <legend>
                    Pick your Post-it
                    color
                  </legend>

                  <div className="post-color-options">
                    {postItColors.map(
                      (
                        option
                      ) => (
                        <button
                          type="button"
                          key={
                            option.value
                          }
                          className={
                            `post-color-choice ` +
                            `post-color-${option.value} ` +
                            (
                              color ===
                              option.value
                                ? "selected"
                                : ""
                            )
                          }
                          onClick={() =>
                            setColor(
                              option.value
                            )
                          }
                          aria-pressed={
                            color ===
                            option.value
                          }
                          title={
                            option.label
                          }
                        >
                          <span>
                            {
                              option.label
                            }
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </fieldset>


                <section className="post-privacy-note">
                  <p className="post-privacy-title">
                    SHARE COMFORTABLY
                  </p>

                  <p>
                    Your Post-it is only
                    an introduction.
                    Share what you feel
                    comfortable with
                    other verified
                    students knowing,
                    and avoid posting
                    sensitive or overly
                    revealing personal
                    information.
                  </p>

                  <p>
                    You can always get
                    to know someone
                    better after you
                    connect and start
                    chatting!
                  </p>
                </section>
              </div>


              <aside className="post-live-preview-area">
                <p className="small-title">
                  LIVE PREVIEW
                </p>

                <div
                  className={
                    `post-it-live-preview ` +
                    `post-color-${color}`
                  }
                >
                  <span className="post-pin">
                  </span>

                  <h3>
                    {displayName.trim() ||
                      "Your Name"}
                  </h3>

                  <p className="preview-major">
                    {myPostIt?.major ||
                      "Your verified major"}
                  </p>

                  <div className="post-divider">
                  </div>

                  <p className="preview-facts">
                    {funFacts.trim() ||
                      "A little something about you will appear here."}
                  </p>

                  <div className="preview-song">
                    <span>
                      ♪
                    </span>

                    <div>
                      <strong>
                        {songTitle.trim() ||
                          "Your song"}
                      </strong>

                      {songArtist.trim() && (
                        <small>
                          {
                            songArtist
                          }
                        </small>
                      )}
                    </div>
                  </div>
                </div>

                <p className="preview-help">
                  Your color updates
                  instantly while you
                  choose.
                </p>
              </aside>


              <button
                className="main-button post-save-button"
                type="submit"
                disabled={
                  saving ||
                  removingPost
                }
              >
                {saving
                  ? "Saving..."
                  : myPostIt
                    ? "Save Changes"
                    : "Pin My Post-it"}
              </button>


              {myPostIt && (
                <button
                  type="button"
                  disabled={
                    saving ||
                    removingPost
                  }
                  onClick={
                    handleRemovePostIt
                  }
                  style={{
                    gridColumn:
                      "1 / -1",

                    width: "100%",

                    padding:
                      "11px 16px",

                    border:
                      "2px solid #a92d36",

                    borderRadius:
                      "999px",

                    background:
                      "#fffafa",

                    color:
                      "#8a2730",

                    cursor:
                      removingPost
                        ? "default"
                        : "pointer",

                    fontWeight:
                      "900",

                    opacity:
                      removingPost
                        ? 0.55
                        : 1,
                  }}
                >
                  {removingPost
                    ? "Removing..."
                    : "Remove My Post-it"}
                </button>
              )}
            </form>
          </section>
        </div>
      )}
    </main>
  );
}


export default BulletinBoard;