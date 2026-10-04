import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getChatMessages,
  getChatWebSocketUrl,
  getMyPresence,
  getMyProfile,
  getUserPresence,
  markChatRead,
  updateMyPresence,
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


function presenceLabel(status) {
  if (status === "online") {
    return "Online";
  }

  if (status === "busy") {
    return "Busy";
  }

  return "Offline";
}


function Avatar({
  src,
  name,
  className = "",
}) {
  const initial =
    name
      ?.trim()
      .charAt(0)
      .toUpperCase() || "?";

  if (src) {
    return (
      <img
        className={
          `chat-avatar-image ${className}`
        }
        src={src}
        alt=""
      />
    );
  }

  return (
    <div
      className={
        `chat-avatar-fallback ${className}`
      }
      aria-hidden="true"
    >
      {initial}
    </div>
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

  const [
    myPresenceMode,
    setMyPresenceMode,
  ] = useState("online");

  const [
    otherPresence,
    setOtherPresence,
  ] = useState(
    connection.presence_status ||
      "offline"
  );

  const [
    presenceSaving,
    setPresenceSaving,
  ] = useState(false);

  const [
    otherTyping,
    setOtherTyping,
  ] = useState(false);

  const [
    myProfilePicture,
    setMyProfilePicture,
  ] = useState(null);

  const socketRef =
    useRef(null);

  const reconnectTimerRef =
    useRef(null);

  const typingTimerRef =
    useRef(null);

  const otherTypingTimerRef =
    useRef(null);

  const shouldReconnectRef =
    useRef(true);

  const messageEndRef =
    useRef(null);

  const composerRef =
    useRef(null);


  useEffect(() => {
    messageEndRef.current
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }, [messages, otherTyping]);


  useEffect(() => {
    const textarea =
      composerRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height =
      "auto";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        150
      )}px`;
  }, [draft]);


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
    let cancelled = false;

    async function loadMyChatIdentity() {
      try {
        const [
          profile,
          presence,
        ] = await Promise.all([
          getMyProfile(token),
          getMyPresence(token),
        ]);

        if (cancelled) {
          return;
        }

        setMyProfilePicture(
          profile?.profile_picture_url ||
            null
        );

        setMyPresenceMode(
          presence.mode || "online"
        );
      } catch {
        // The chat can still work without
        // profile or presence decoration.
      }
    }

    loadMyChatIdentity();

    return () => {
      cancelled = true;
    };
  }, [token]);


  useEffect(() => {
    let cancelled = false;

    async function refreshOtherPresence() {
      try {
        const presence =
          await getUserPresence(
            token,
            connection.user_id
          );

        if (!cancelled) {
          setOtherPresence(
            presence.status ||
              "offline"
          );
        }
      } catch {
        if (!cancelled) {
          setOtherPresence(
            "offline"
          );
        }
      }
    }

    refreshOtherPresence();

    const timer =
      window.setInterval(
        refreshOtherPresence,
        15000
      );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    token,
    connection.user_id,
    myPresenceMode,
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

          if (
            data.sender_id !==
            currentUser.id
          ) {
            markChatRead(
              token,
              connection.id
            ).catch(() => {});
          }

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
          data.type === "typing" &&
          data.user_id ===
            connection.user_id
        ) {
          setOtherTyping(
            Boolean(
              data.is_typing
            )
          );

          if (
            otherTypingTimerRef.current
          ) {
            window.clearTimeout(
              otherTypingTimerRef.current
            );
          }

          if (data.is_typing) {
            otherTypingTimerRef.current =
              window.setTimeout(
                () => {
                  setOtherTyping(false);
                },
                2500
              );
          }

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
            window.setTimeout(
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
        window.clearTimeout(
          reconnectTimerRef.current
        );
      }

      if (typingTimerRef.current) {
        window.clearTimeout(
          typingTimerRef.current
        );
      }

      if (
        otherTypingTimerRef.current
      ) {
        window.clearTimeout(
          otherTypingTimerRef.current
        );
      }

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [
    token,
    connection.id,
    connection.user_id,
    currentUser.id,
  ]);


  function sendTypingState(
    isTyping
  ) {
    if (
      socketStatus !== "connected" ||
      !socketRef.current
    ) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "typing",
        is_typing: isTyping,
      })
    );
  }


  function handleDraftChange(
    event
  ) {
    const value =
      event.target.value;

    setDraft(value);

    if (
      typingTimerRef.current
    ) {
      window.clearTimeout(
        typingTimerRef.current
      );
    }

    if (value.trim()) {
      sendTypingState(true);

      typingTimerRef.current =
        window.setTimeout(
          () => {
            sendTypingState(false);
          },
          1200
        );
    } else {
      sendTypingState(false);
    }
  }


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

    sendTypingState(false);

    setDraft("");
    setError("");
  }


  async function handlePresenceChange(
    event
  ) {
    const nextMode =
      event.target.value;

    setPresenceSaving(true);

    try {
      const result =
        await updateMyPresence(
          token,
          nextMode
        );

      setMyPresenceMode(
        result.mode || nextMode
      );
    } catch (presenceError) {
      setError(
        presenceError.message
      );
    } finally {
      setPresenceSaving(false);
    }
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


  const otherAvatar =
    connection.profile_picture_url ||
    null;

  const transportLabel =
    socketStatus === "connected"
      ? "Chat connected"
      : "Reconnecting";


  return (
    <main className="chat-page">
      <section className="chat-shell">
        <header className="chat-header">
          <button
            className="chat-back-button"
            type="button"
            onClick={onBack}
            aria-label="Back"
          >
            ←
          </button>

          <div className="chat-person">
            <div
              className={
                `chat-header-avatar ` +
                `presence-${otherPresence}`
              }
            >
              <Avatar
                src={otherAvatar}
                name={
                  connection.display_name
                }
              />

              <span
                className="presence-dot"
                aria-hidden="true"
              />
            </div>

            <div className="chat-person-copy">
              <h1>
                {connection.display_name}
              </h1>

              <div className="chat-person-subline">
                <span>
                  {connection.major}
                </span>

                <span
                  className={
                    `chat-presence-text ` +
                    `presence-${otherPresence}`
                  }
                >
                  {presenceLabel(
                    otherPresence
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="chat-header-actions">
            <label className="chat-presence-picker">
              <span>
                You
              </span>

              <select
                value={myPresenceMode}
                disabled={presenceSaving}
                onChange={
                  handlePresenceChange
                }
                aria-label="Your presence status"
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
              className="chat-safety-button"
              type="button"
              onClick={() =>
                setShowSafety(true)
              }
            >
              Safety
            </button>
          </div>
        </header>

        <div className="chat-connection-strip">
          <span
            className={
              socketStatus === "connected"
                ? "transport-dot connected"
                : "transport-dot"
            }
          />

          {transportLabel}

          {myPresenceMode ===
            "invisible" && (
            <span className="invisible-note">
              · Appear Offline is hiding
              everyone&apos;s status from you.
            </span>
          )}
        </div>


        {error && (
          <div className="chat-error">
            {error}
          </div>
        )}


        <section className="message-window">
          {loading ? (
            <div className="chat-empty">
              <div className="chat-empty-pin">
                ✦
              </div>

              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-pin">
                ✦
              </div>

              <h2>
                A fresh piece of paper.
              </h2>

              <p>
                You and{" "}
                {connection.display_name}{" "}
                are connected.
              </p>

              <p>
                Say hello and see where
                the conversation goes.
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
                    {!isMine && (
                      <Avatar
                        src={otherAvatar}
                        name={
                          connection.display_name
                        }
                        className="message-avatar"
                      />
                    )}

                    <div className="message-stack">
                      <div className="message-bubble">
                        <p>
                          {message.content}
                        </p>
                      </div>

                      <div className="message-meta">
                        <span>
                          {formatTime(
                            message.created_at
                          )}
                        </span>

                        {isMine && (
                          <span
                            className={
                              message.read_at
                                ? "read-state read"
                                : "read-state"
                            }
                          >
                            {message.read_at
                              ? "Read"
                              : "Sent"}
                          </span>
                        )}
                      </div>
                    </div>

                    {isMine && (
                      <Avatar
                        src={
                          myProfilePicture
                        }
                        name={
                          currentUser.username
                        }
                        className="message-avatar"
                      />
                    )}
                  </article>
                );
              }
            )
          )}

          {otherTyping && (
            <div className="typing-row">
              <Avatar
                src={otherAvatar}
                name={
                  connection.display_name
                }
                className="message-avatar"
              />

              <div className="typing-bubble">
                <span />
                <span />
                <span />
              </div>

              <small>
                {connection.display_name}{" "}
                is typing
              </small>
            </div>
          )}

          <div
            ref={messageEndRef}
          />
        </section>


        <div className="composer-area">
          <form
            className="chat-composer"
            onSubmit={sendMessage}
          >
            <div
              className="composer-spark"
              aria-hidden="true"
            >
              ✦
            </div>

            <textarea
              ref={composerRef}
              rows="1"
              maxLength="2000"
              value={draft}
              onChange={
                handleDraftChange
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  sendMessage(event);
                }
              }}
              placeholder={
                `Message ${connection.display_name}...`
              }
              spellCheck={true}
              autoCorrect="on"
              autoCapitalize="sentences"
              lang="en"
            />

            <button
              type="submit"
              disabled={
                !draft.trim() ||
                socketStatus !==
                  "connected"
              }
              aria-label="Send message"
            >
              <span>
                Send
              </span>

              <strong
                aria-hidden="true"
              >
                ➜
              </strong>
            </button>
          </form>

          <p className="chat-hint">
            Enter to send ·
            Shift + Enter for a new line ·
            Browser spellcheck is enabled
          </p>
        </div>
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
