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
} from "./api";


function MyConnections({
  token,
  onViewProfile,
  onOpenChat,
  onBackToBulletin,
  onLogout,
}) {
  const [connections, setConnections] =
    useState([]);

  const [suggestions, setSuggestions] =
    useState([]);

  const [chats, setChats] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [
    connectingUserId,
    setConnectingUserId,
  ] = useState(null);


  const loadConnections = useCallback(
    async () => {
      setLoading(true);
      setMessage("");

      try {
        const [
          connectionData,
          chatData,
          blockData,
        ] = await Promise.all([
          getConnections(token),
          getChats(token),
          getMyBlocks(token),
        ]);

        const blockedUserIds =
          new Set(
            blockData.map(
              (block) =>
                block.blocked_user_id
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
        setLoading(false);
      }
    },
    [token]
  );


  useEffect(() => {
    loadConnections();
  }, [loadConnections]);


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
      setConnectingUserId(null);
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


  function moderationBadge(person) {
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
        ) : connections.length === 0 ? (
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
                    key={connection.id}
                  >
                    <div className="verification-info">
                      <p className="small-title">
                        CONNECTED
                      </p>

                      <h3>
                        {connection.display_name}
                      </h3>

                      <p>
                        <strong>
                          Major:
                        </strong>{" "}
                        {connection.major}
                      </p>

                      {chat?.last_message ? (
                        <p className="submitted-date">
                          Latest:{" "}
                          {chat.last_message}
                        </p>
                      ) : (
                        <p className="submitted-date">
                          No messages yet.
                        </p>
                      )}

                      {chat?.unread_count > 0 && (
                        <div className="status-badge">
                          {chat.unread_count}{" "}
                          {chat.unread_count === 1
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
                          onOpenChat(
                            connection
                          )
                        }
                      >
                        {chat?.unread_count > 0
                          ? `Chat (${chat.unread_count})`
                          : "Chat"}
                      </button>

                      <button
                        className="needs-info-button"
                        type="button"
                        onClick={() =>
                          onViewProfile(
                            connection.user_id
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
              PEOPLE YOU MAY KNOW
            </p>

            <h2>
              Mutual Connections
            </h2>
          </div>
        </div>


        {loading ? (
          <div className="empty-state">
            Finding people...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="empty-state">
            <h3>
              No suggestions yet
            </h3>

            <p>
              As your network grows,
              students connected to your
              connections will appear here.
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
                      SUGGESTED CONNECTION
                    </p>

                    <h3>
                      {suggestion.display_name}
                    </h3>

                    <p>
                      <strong>
                        Major:
                      </strong>{" "}
                      {suggestion.major}
                    </p>

                    <p>
                      <strong>
                        {suggestion.mutual_count}
                      </strong>{" "}
                      {suggestion.mutual_count === 1
                        ? "mutual connection"
                        : "mutual connections"}
                    </p>

                    {suggestion
                      .mutual_connections
                      .length > 0 && (
                      <p className="submitted-date">
                        You both know:{" "}
                        {suggestion
                          .mutual_connections
                          .join(", ")}
                      </p>
                    )}

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