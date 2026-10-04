import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createConnection,
  getChats,
  getConnections,
  getConnectionSuggestions,
  getMyBlocks,
  getMyPresence,
  updateMyPresence,
} from "./api";


function MyConnections({
  token,
  onViewProfile,
  onOpenChat,
  onBackToBulletin,
  onLogout,
}) {
  const [
    connections,
    setConnections,
  ] = useState([]);

  const [
    suggestions,
    setSuggestions,
  ] = useState([]);

  const [
    chats,
    setChats,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    connectingUserId,
    setConnectingUserId,
  ] = useState(null);


  const [
    presenceMode,
    setPresenceMode,
  ] = useState("online");

  const [
    presenceSaving,
    setPresenceSaving,
  ] = useState(false);


  const loadConnections =
    useCallback(
      async (
        showLoading = true
      ) => {
        if (showLoading) {
          setLoading(true);
          setMessage("");
        }

        try {
          const [
            connectionData,
            chatData,
            blockData,
            presenceData,
          ] = await Promise.all([
            getConnections(token),
            getChats(token),
            getMyBlocks(token),
            getMyPresence(token),
          ]);

          setPresenceMode(
            presenceData.mode ||
              "online"
          );

          const blockedUserIds =
            new Set(
              blockData.map(
                (block) =>
                  block
                    .blocked_user_id
              )
            );

          setConnections(
            connectionData.filter(
              (connection) =>
                !blockedUserIds.has(
                  connection.user_id
                )
            )
          );

          setChats(
            chatData.filter(
              (chat) =>
                !blockedUserIds.has(
                  chat.user_id
                )
            )
          );

          try {
            const suggestionData =
              await getConnectionSuggestions(
                token
              );

            setSuggestions(
              suggestionData.filter(
                (suggestion) =>
                  !blockedUserIds.has(
                    suggestion.user_id
                  )
              )
            );
          } catch (error) {
            setSuggestions([]);

            if (
              error.message !==
              "Create a Post-it before viewing connection suggestions"
            ) {
              setMessage(
                error.message
              );
            }
          }
        } catch (error) {
          setMessage(
            error.message
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [token]
    );


  useEffect(() => {
    loadConnections();
  }, [loadConnections]);


  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          loadConnections(false);
        },
        20000
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [loadConnections]);


  async function handlePresenceChange(
    event
  ) {
    const nextMode =
      event.target.value;

    setPresenceSaving(true);
    setMessage("");

    try {
      const result =
        await updateMyPresence(
          token,
          nextMode
        );

      setPresenceMode(
        result.mode || nextMode
      );

      await loadConnections(false);
    } catch (error) {
      setMessage(
        error.message
      );
    } finally {
      setPresenceSaving(false);
    }
  }


  function presenceLabel(
    status
  ) {
    if (status === "online") {
      return "Online";
    }

    if (status === "busy") {
      return "Busy";
    }

    return "Offline";
  }


  function presenceColor(
    status
  ) {
    if (status === "online") {
      return "#20a65a";
    }

    if (status === "busy") {
      return "#d7a51e";
    }

    return "#a7aaa7";
  }


  async function handleConnect(
    suggestion
  ) {
    setConnectingUserId(
      suggestion.user_id
    );

    setMessage("");

    try {
      await createConnection(
        token,
        suggestion.user_id
      );

      setMessage(
        `You and ${suggestion.display_name} are now connected!`
      );

      await loadConnections();
    } catch (error) {
      setMessage(
        error.message
      );
    } finally {
      setConnectingUserId(
        null
      );
    }
  }


  function getChatSummary(
    connectionId
  ) {
    return chats.find(
      (chat) =>
        chat.connection_id ===
        connectionId
    );
  }


  function moderationBadge(
    person
  ) {
    if (
      !person.moderation ||
      person.moderation.level ===
        "none"
    ) {
      return null;
    }

    return (
      <span
        className={
          person.moderation.level ===
          "red"
            ? "safety-notice safety-red"
            : "safety-notice safety-yellow"
        }
      >
        Safety notice
      </span>
    );
  }


  return (
    <main className="bulletin-page">
      <header className="bulletin-header">
        <div>
          <p className="small-title">
            GET CONNECTED
          </p>

          <h1>
            My Connections
          </h1>

          <p>
            The people you&apos;ve met
            through the bulletin.
          </p>
        </div>

        <div className="bulletin-header-actions">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 10px",
              border: "1px solid #d7cfaa",
              borderRadius: "999px",
              background: "#fffbea",
              color: "#4e5b52",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            <span>
              My status
            </span>

            <select
              value={presenceMode}
              disabled={presenceSaving}
              onChange={
                handlePresenceChange
              }
              style={{
                border: "none",
                background: "transparent",
                color: "#006633",
                fontWeight: 900,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="online">
                Online
              </option>

              <option value="busy">
                Busy
              </option>

              <option value="invisible">
                Appear Offline
              </option>
            </select>
          </label>

          <button
            className="header-button"
            type="button"
            onClick={
              onBackToBulletin
            }
          >
            Back to Bulletin
          </button>

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


      {presenceMode ===
        "invisible" && (
        <div
          className="bulletin-message"
          style={{
            background: "#f1efe6",
            borderColor: "#d3cfbe",
            color: "#626862",
          }}
        >
          Appear Offline is on. Other
          students see you as offline,
          and everyone else appears
          offline to you too.
        </div>
      )}


      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="small-title">
              YOUR PEOPLE
            </p>

            <h2>
              Connections
            </h2>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={
              loadConnections
            }
          >
            Refresh
          </button>
        </div>


        {loading ? (
          <div className="empty-state">
            Loading your connections...
          </div>
        ) : connections.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              No connections yet!
            </h3>

            <p>
              Head back to the bulletin
              and press Get Connected on
              someone&apos;s Post-it.
            </p>
          </div>
        ) : (
          <div className="verification-list">
            {connections.map(
              (connection) => {
                const chat =
                  getChatSummary(
                    connection.id
                  );

                return (
                  <article
                    className="verification-card"
                    key={
                      connection.id
                    }
                  >
                    <div className="verification-info">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "48px",
                            height: "48px",
                            flex: "0 0 48px",
                          }}
                        >
                          {chat?.profile_picture_url ? (
                            <img
                              src={
                                chat.profile_picture_url
                              }
                              alt=""
                              style={{
                                width: "48px",
                                height: "48px",
                                objectFit: "cover",
                                borderRadius: "50%",
                                border: "2px solid #fffbea",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                display: "grid",
                                placeItems: "center",
                                borderRadius: "50%",
                                background: "#006633",
                                color: "white",
                                fontWeight: 900,
                                fontSize: "20px",
                              }}
                            >
                              {connection.display_name
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <span
                            title={
                              presenceLabel(
                                chat?.presence_status
                              )
                            }
                            style={{
                              position: "absolute",
                              right: "0",
                              bottom: "1px",
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              border: "2px solid #fff",
                              background:
                                presenceColor(
                                  chat?.presence_status
                                ),
                            }}
                          />
                        </div>

                        <div>
                          <p className="small-title">
                            CONNECTED
                          </p>

                          <h3>
                            {
                              connection
                                .display_name
                            }
                          </h3>

                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: "12px",
                              fontWeight: 800,
                              color:
                                presenceColor(
                                  chat?.presence_status
                                ),
                            }}
                          >
                            {presenceLabel(
                              chat?.presence_status
                            )}
                          </p>
                        </div>
                      </div>

                      <p>
                        <strong>
                          Major:
                        </strong>{" "}
                        {
                          connection
                            .major
                        }
                      </p>

                      {chat
                        ?.last_message ? (
                        <p className="submitted-date">
                          Latest:{" "}
                          {
                            chat
                              .last_message
                          }
                        </p>
                      ) : (
                        <p className="submitted-date">
                          No messages yet.
                        </p>
                      )}

                      {chat
                        ?.unread_count >
                        0 && (
                        <div className="status-badge">
                          {
                            chat
                              .unread_count
                          }{" "}
                          {chat
                            .unread_count ===
                          1
                            ? "new message"
                            : "new messages"}
                        </div>
                      )}

                      {moderationBadge(
                        connection
                      )}
                    </div>

                    <div className="verification-actions">
                      <button
                        className="verify-button"
                        type="button"
                        onClick={() =>
                          onOpenChat({
                            ...connection,
                            profile_picture_url:
                              chat?.profile_picture_url ||
                              null,
                            presence_status:
                              chat?.presence_status ||
                              "offline",
                          })
                        }
                      >
                        {chat
                          ?.unread_count >
                        0
                          ? `Chat (${chat.unread_count})`
                          : "Chat"}
                      </button>

                      <button
                        className="needs-info-button"
                        type="button"
                        onClick={() =>
                          onViewProfile(
                            connection
                              .user_id
                          )
                        }
                      >
                        View Profile
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>


      <section
        className="admin-panel"
        style={{
          marginTop: "24px",
        }}
      >
        <div className="admin-panel-heading">
          <div>
            <p className="small-title">
              PEOPLE YOU MAY CLICK WITH
            </p>

            <h2>
              Shared Interests
            </h2>
          </div>
        </div>


        {loading ? (
          <div className="empty-state">
            Finding people with
            similar interests...
          </div>
        ) : suggestions.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              No interest matches yet
            </h3>

            <p>
              Add a few interests to
              your profile, separated
              by commas. Students who
              share at least one of
              those interests can
              appear here.
            </p>
          </div>
        ) : (
          <div className="verification-list">
            {suggestions.map(
              (suggestion) => (
                <article
                  className="verification-card"
                  key={
                    suggestion.user_id
                  }
                >
                  <div className="verification-info">
                    <p className="small-title">
                      YOU MAY CLICK
                    </p>

                    <h3>
                      {
                        suggestion
                          .display_name
                      }
                    </h3>

                    <p>
                      <strong>
                        Major:
                      </strong>{" "}
                      {
                        suggestion
                          .major
                      }
                    </p>

                    <p>
                      <strong>
                        {suggestion
                          .shared_interest_count}
                      </strong>{" "}
                      {suggestion
                        .shared_interest_count ===
                      1
                        ? "shared interest"
                        : "shared interests"}
                    </p>

                    <p className="submitted-date">
                      <strong>
                        Also likes:
                      </strong>{" "}
                      {suggestion
                        .shared_interests
                        .join(" • ")}
                    </p>

                    {moderationBadge(
                      suggestion
                    )}
                  </div>

                  <div className="verification-actions">
                    <button
                      className="verify-button"
                      type="button"
                      disabled={
                        connectingUserId ===
                        suggestion.user_id
                      }
                      onClick={() =>
                        handleConnect(
                          suggestion
                        )
                      }
                    >
                      {connectingUserId ===
                      suggestion.user_id
                        ? "Connecting..."
                        : "Get Connected!"}
                    </button>

                    <button
                      className="needs-info-button"
                      type="button"
                      onClick={() =>
                        onViewProfile(
                          suggestion.user_id
                        )
                      }
                    >
                      View Profile
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}


export default MyConnections;