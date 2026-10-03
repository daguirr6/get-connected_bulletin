import {
  useEffect,
  useState,
} from "react";

import {
  sendFeedback,
} from "./feedbackApi";

import "./FeedbackModal.css";


const AREA_OPTIONS = [
  {
    value: "bulletin",
    label: "Bulletin",
  },

  {
    value: "connections",
    label: "Connections",
  },

  {
    value: "chats",
    label: "Chats",
  },

  {
    value: "profiles",
    label: "Profiles",
  },

  {
    value: "post_it",
    label: "Post-it Creation",
  },

  {
    value: "verification",
    label: "Verification / Accounts",
  },

  {
    value: "safety_appeals",
    label: "Safety & Appeals",
  },

  {
    value: "mobile_layout",
    label: "Mobile / Layout",
  },

  {
    value: "other",
    label: "Other",
  },
];


const TOPIC_OPTIONS = [
  {
    value: "bug",
    label: "Something is broken",
  },

  {
    value: "suggestion",
    label: "Suggestion / New idea",
  },

  {
    value: "design",
    label: "Design / Appearance",
  },

  {
    value: "safety",
    label: "Safety concern",
  },

  {
    value: "accessibility",
    label: "Accessibility",
  },

  {
    value: "other",
    label: "Other",
  },
];


function FeedbackModal({
  open,
  onClose,
}) {
  const [area, setArea] =
    useState("bulletin");

  const [topic, setTopic] =
    useState("suggestion");

  const [message, setMessage] =
    useState("");

  const [
    includeUsername,
    setIncludeUsername,
  ] = useState(false);

  const [sending, setSending] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");


  const loggedIn = Boolean(
    sessionStorage.getItem(
      "access_token"
    )
  );


  useEffect(() => {
    if (!open) {
      return;
    }


    function handleEscape(
      event
    ) {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    }


    document.addEventListener(
      "keydown",
      handleEscape
    );


    document.body.style.overflow =
      "hidden";


    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow =
        "";
    };
  }, [
    open,
    onClose,
  ]);


  function closeModal() {
    if (sending) {
      return;
    }

    onClose();
  }


  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    const cleanMessage =
      message.trim();


    if (
      cleanMessage.length < 10
    ) {
      setError(
        "Please give us a little more detail before sending."
      );

      return;
    }


    setSending(true);
    setError("");
    setSuccess("");


    try {
      const response =
        await sendFeedback({
          area,
          topic,

          message:
            cleanMessage,

          includeUsername:
            (
              loggedIn &&
              includeUsername
            ),
        });


      setSuccess(
        response.message ||
          "Thanks! Your feedback was sent."
      );


      setMessage("");
      setIncludeUsername(
        false
      );

    } catch (submitError) {
      setError(
        submitError.message
      );

    } finally {
      setSending(false);
    }
  }


  if (!open) {
    return null;
  }


  return (
    <div
      className="feedback-backdrop"
      onMouseDown={
        closeModal
      }
    >
      <section
        className="feedback-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          className="feedback-close"
          onClick={closeModal}
          aria-label="Close feedback form"
        >
          ×
        </button>


        <p className="feedback-eyebrow">
          HELP SHAPE GET CONNECTED
        </p>

        <h2>
          Feedback
        </h2>

        <p className="feedback-intro">
          Found something weird?
          Have an idea?
          Think something could be
          easier, safer, or more fun?
          Tell me about it.
        </p>


        {success && (
          <div className="feedback-success">
            {success}
          </div>
        )}


        {error && (
          <div className="feedback-error">
            {error}
          </div>
        )}


        <form
          onSubmit={
            handleSubmit
          }
        >
          <label>
            What is this about?

            <select
              value={area}
              onChange={(event) =>
                setArea(
                  event.target.value
                )
              }
            >
              {AREA_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </label>


          <label>
            What kind of feedback?

            <select
              value={topic}
              onChange={(event) =>
                setTopic(
                  event.target.value
                )
              }
            >
              {TOPIC_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </label>


          <label>
            Tell us what you think

            <textarea
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              rows={8}
              maxLength={5000}
              placeholder="What happened, what would you change, or what would you like to see?"
              required
            />

            <small>
              {message.length}
              /5000
            </small>
          </label>


          {loggedIn && (
            <label className="feedback-identity-option">
              <input
                type="checkbox"
                checked={
                  includeUsername
                }
                onChange={
                  (event) =>
                    setIncludeUsername(
                      event.target
                        .checked
                    )
                }
              />

              <span>
                Include my
                Get Connected username
                with this feedback.
              </span>
            </label>
          )}


          <div className="feedback-privacy">
            <strong>
              Privacy note:
            </strong>{" "}

            You do not need to provide
            an email address, phone
            number, Mason password,
            Duo code, or other
            university credentials.
          </div>


          <button
            type="submit"
            className="feedback-send-button"
            disabled={sending}
          >
            {sending
              ? "Sending..."
              : "Send Feedback"}
          </button>
        </form>
      </section>
    </div>
  );
}


export default FeedbackModal;