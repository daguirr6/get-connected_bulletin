import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getChatMessages,
  getChatWebSocketUrl,
  markChatRead,
} from "./api";

import SafetyModal from "./SafetyModal";

import "./ChatPage.css";


function mergeMessages(
  currentMessages,
  incomingMessages
) {
  const messagesById =
    new Map();

  for (
    const message
    of currentMessages
  ) {
    messagesById.set(
      message.id,
      message
    );
  }

  for (
    const message
    of incomingMessages
  ) {
    const existing =
      messagesById.get(
        message.id
      );

    messagesById.set(
      message.id,
      {
        ...existing,
        ...message,
      }
    );
  }

  return Array
    .from(
      messagesById.values()
    )
    .sort(
      (a, b) =>
        new Date(a.created_at) -
        new Date(b.created_at)
    );
}


function ChatPage({
  token,
  currentUser,
  connection,
  onBack,
}) {
  const [messages, setMessages] =
    useState([]);

  const [draft, setDraft] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    socketStatus,
    setSocketStatus,
  ] = useState("connecting");

  const [
    showSafety,
    setShowSafety,
  ] = useState(false);

  const socketRef =
    useRef(null);

  const reconnectTimerRef =
    useRef(null);

  const shouldReconnectRef =
    useRef(true);

  const messageEndRef =
    useRef(null);


  useEffect(() => {
    messageEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [messages]);


  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const history =
          await getChatMessages(
            token,
            connection.id
          );

        if (cancelled) {
          return;
        }

        setMessages(
          (current) =>
            mergeMessages(
              current,
              history
            )
        );

        await markChatRead(
          token,
          connection.id
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError.message
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [
    token,
    connection.id,
  ]);


  useEffect(() => {
    shouldReconnectRef.current =
      true;

    function connectSocket() {
      setSocketStatus(
        "connecting"
      );

      const socket =
        new WebSocket(
          getChatWebSocketUrl(
            connection.id
          )
        );

      socketRef.current =
        socket;


      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "auth",
            token,
          })
        );
      };


      socket.onmessage = (
        event
      ) => {
        let data;

        try {
          data =
            JSON.parse(
              event.data
            );
        } catch {
          return;
        }


        if (
          data.type === "ready"
        ) {
          setSocketStatus(
            "connected"
          );

          setError("");

          return;
        }


        if (
          data.type === "message"
        ) {
          setMessages(
            (current) =>
              mergeMessages(
                current,
                [data]
              )
          );

          return;
        }


        if (
          data.type === "read"
        ) {
          const readIds =
            new Set(
              data.message_ids || []
            );

          setMessages(
            (current) =>
              current.map(
                (message) => {
                  if (
                    !readIds.has(
                      message.id
                    )
                  ) {
                    return message;
                  }

                  return {
                    ...message,
                    read_at:
                      data.read_at,
                  };
                }
              )
          );

          return;
        }


        if (
          data.type === "error"
        ) {
          setError(
            data.message ||
              "Chat error"
          );
        }
      };


      socket.onerror = () => {
        setSocketStatus(
          "disconnected"
        );
      };


      socket.onclose = () => {
        setSocketStatus(
          "disconnected"
        );

        socketRef.current =
          null;

        if (
          shouldReconnectRef.current
        ) {
          reconnectTimerRef.current =
            setTimeout(
              connectSocket,
              2000
            );
        }
      };
    }


    connectSocket();


    return () => {
      shouldReconnectRef.current =
        false;

      if (
        reconnectTimerRef.current
      ) {
        clearTimeout(
          reconnectTimerRef.current
        );
      }

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [
    token,
    connection.id,
  ]);


  function sendMessage(event) {
    event.preventDefault();

    const content =
      draft.trim();

    if (!content) {
      return;
    }

    if (
      socketStatus !== "connected" ||
      !socketRef.current
    ) {
      setError(
        "Chat is reconnecting. Try again in a moment."
      );

      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "message",
        content,
      })
    );

    setDraft("");
    setError("");
  }


  function formatTime(dateValue) {
    const date =
      new Date(dateValue);

    return date.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }


  function handleBlocked() {
    setShowSafety(false);

    shouldReconnectRef.current =
      false;

    if (socketRef.current) {
      socketRef.current.close();
    }

    onBack();
  }


  return (
    <main className="chat-page">
      <section className="chat-shell">
        <header className="chat-header">
          <button
            className="chat-back-button"
            type="button"
            onClick={onBack}
          >
            ←
          </button>

          <div className="chat-person">
            <div className="chat-avatar">
              {connection
                .display_name
                .trim()
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <h1>
                {connection.display_name}
              </h1>

              <p>
                {connection.major}
              </p>
            </div>
          </div>

          <div className="chat-header-actions">
            <button
              className="chat-safety-button"
              type="button"
              onClick={() =>
                setShowSafety(true)
              }
            >
              Safety
            </button>

            <div
              className={
                `chat-status ` +
                (
                  socketStatus ===
                  "connected"
                    ? "online"
                    : ""
                )
              }
            >
              <span>
              </span>

              {socketStatus ===
              "connected"
                ? "Live"
                : "Connecting"}
            </div>
          </div>
        </header>


        {error && (
          <div className="chat-error">
            {error}
          </div>
        )}


        <section className="message-window">
          {loading ? (
            <div className="chat-empty">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <h2>
                Say hello!
              </h2>

              <p>
                You and{" "}
                {connection.display_name}{" "}
                are connected.
              </p>

              <p>
                This is the beginning
                of your conversation.
              </p>
            </div>
          ) : (
            messages.map(
              (message) => {
                const isMine =
                  message.sender_id ===
                  currentUser.id;

                return (
                  <article
                    className={
                      isMine
                        ? "message-row mine"
                        : "message-row theirs"
                    }
                    key={message.id}
                  >
                    <div className="message-bubble">
                      <p>
                        {message.content}
                      </p>

                      <div className="message-meta">
                        <span>
                          {formatTime(
                            message.created_at
                          )}
                        </span>

                        {isMine && (
                          <span>
                            {message.read_at
                              ? "Read"
                              : "Sent"}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )
          )}

          <div
            ref={messageEndRef}
          />
        </section>


        <form
          className="chat-composer"
          onSubmit={sendMessage}
        >
          <textarea
            rows="1"
            maxLength="2000"
            value={draft}
            onChange={(event) =>
              setDraft(
                event.target.value
              )
            }
            onKeyDown={(
              event
            ) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();

                sendMessage(
                  event
                );
              }
            }}
            placeholder={
              `Message ${connection.display_name}...`
            }
          />

          <button
            type="submit"
            disabled={
              !draft.trim() ||
              socketStatus !==
                "connected"
            }
          >
            Send
          </button>
        </form>

        <p className="chat-hint">
          Enter to send ·
          Shift + Enter for a new line
        </p>
      </section>


      {showSafety && (
        <SafetyModal
          token={token}
          targetUserId={
            connection.user_id
          }
          targetName={
            connection.display_name
          }
          onClose={() =>
            setShowSafety(false)
          }
          onBlocked={
            handleBlocked
          }
        />
      )}
    </main>
  );
}


export default ChatPage;