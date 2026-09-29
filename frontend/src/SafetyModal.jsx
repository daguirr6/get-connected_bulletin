import {
  useState,
} from "react";

import {
  blockUser,
  reportUser,
} from "./api";

import "./SafetyModal.css";


const reportCategories = [
  {
    value: "harassment",
    label: "Harassment",
  },
  {
    value: "unwanted_messages",
    label: "Unwanted messages",
  },
  {
    value: "threatening_behavior",
    label: "Threatening behavior",
  },
  {
    value: "inappropriate_content",
    label: "Inappropriate content",
  },
  {
    value: "impersonation",
    label: "Impersonation",
  },
  {
    value: "spam",
    label: "Spam",
  },
  {
    value: "other",
    label: "Other",
  },
];


function SafetyModal({
  token,
  targetUserId,
  targetName,
  onClose,
  onBlocked,
}) {
  const [screen, setScreen] =
    useState("menu");

  const [reason, setReason] =
    useState("");

  const [category, setCategory] =
    useState("harassment");

  const [details, setDetails] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  async function handleBlock(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      await blockUser(
        token,
        targetUserId,
        reason.trim()
      );

      if (onBlocked) {
        onBlocked();
      }
    } catch (blockError) {
      setError(
        blockError.message
      );
    } finally {
      setSubmitting(false);
    }
  }


  async function handleReport(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      await reportUser(
        token,
        targetUserId,
        category,
        details.trim()
      );

      setSuccess(
        "Your report was submitted for admin review."
      );

      setScreen("success");
    } catch (reportError) {
      setError(
        reportError.message
      );
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div
      className="safety-backdrop"
      onMouseDown={onClose}
    >
      <section
        className="safety-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          `Safety options for ${targetName}`
        }
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <button
          className="safety-close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>


        {screen === "menu" && (
          <>
            <p className="small-title">
              SAFETY OPTIONS
            </p>

            <h2>
              {targetName}
            </h2>

            <p className="safety-intro">
              You&apos;re always allowed
              to decide who can interact
              with you.
            </p>

            <button
              className="safety-option block-option"
              type="button"
              onClick={() => {
                setError("");
                setScreen("block");
              }}
            >
              <strong>
                Block this student
              </strong>

              <span>
                Stop receiving their
                messages and hide them
                from your experience.
              </span>
            </button>

            <button
              className="safety-option report-option"
              type="button"
              onClick={() => {
                setError("");
                setScreen("report");
              }}
            >
              <strong>
                Report this student
              </strong>

              <span>
                Send a concern to the
                Get Connected admin for
                review.
              </span>
            </button>

            <p className="safety-private-note">
              Blocking and reporting are
              separate actions. A report
              does not automatically place
              a public warning on someone&apos;s
              account.
            </p>
          </>
        )}


        {screen === "block" && (
          <>
            <p className="small-title">
              BLOCK STUDENT
            </p>

            <h2>
              Block {targetName}?
            </h2>

            <p className="safety-intro">
              Blocking takes effect
              immediately. The reason
              you provide is private
              and is only available for
              moderation purposes.
            </p>

            <form
              className="safety-form"
              onSubmit={handleBlock}
            >
              <label>
                Why are you blocking
                this student?

                <textarea
                  rows="5"
                  minLength="3"
                  maxLength="1000"
                  value={reason}
                  onChange={(event) =>
                    setReason(
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              {error && (
                <p className="safety-error">
                  {error}
                </p>
              )}

              <div className="safety-buttons">
                <button
                  className="safety-secondary"
                  type="button"
                  onClick={() => {
                    setError("");
                    setScreen("menu");
                  }}
                >
                  Back
                </button>

                <button
                  className="safety-danger"
                  type="submit"
                  disabled={
                    submitting ||
                    reason.trim().length < 3
                  }
                >
                  {submitting
                    ? "Blocking..."
                    : "Block Student"}
                </button>
              </div>
            </form>
          </>
        )}


        {screen === "report" && (
          <>
            <p className="small-title">
              REPORT STUDENT
            </p>

            <h2>
              Report {targetName}
            </h2>

            <p className="safety-intro">
              Tell the admin what happened.
              Reports are reviewed before
              moderation action is taken.
            </p>

            <form
              className="safety-form"
              onSubmit={handleReport}
            >
              <label>
                What happened?

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                >
                  {reportCategories.map(
                    (item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Tell us more

                <textarea
                  rows="6"
                  minLength="5"
                  maxLength="2000"
                  value={details}
                  onChange={(event) =>
                    setDetails(
                      event.target.value
                    )
                  }
                  placeholder={
                    "Explain what happened and include anything you think the admin should know."
                  }
                  required
                />
              </label>

              {error && (
                <p className="safety-error">
                  {error}
                </p>
              )}

              <div className="safety-buttons">
                <button
                  className="safety-secondary"
                  type="button"
                  onClick={() => {
                    setError("");
                    setScreen("menu");
                  }}
                >
                  Back
                </button>

                <button
                  className="safety-report-button"
                  type="submit"
                  disabled={
                    submitting ||
                    details.trim().length < 5
                  }
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Report"}
                </button>
              </div>
            </form>
          </>
        )}


        {screen === "success" && (
          <div className="safety-success">
            <p className="small-title">
              REPORT RECEIVED
            </p>

            <h2>
              Thank you.
            </h2>

            <p>
              {success}
            </p>

            <p>
              The person you reported
              is not automatically given
              a public warning. The report
              will be reviewed first.
            </p>

            <button
              className="safety-report-button"
              type="button"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </section>
    </div>
  );
}


export default SafetyModal;