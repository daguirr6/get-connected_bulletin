import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createAppeal,
  getMyAppeals,
  getMyModerationActions,
} from "./appealsApi";

import "./SafetyCenter.css";


function SafetyCenter({
  token,
  onBack,
  onLogout,
}) {
  const [
    actions,
    setActions,
  ] = useState([]);

  const [
    appeals,
    setAppeals,
  ] = useState([]);

  const [
    appealReasons,
    setAppealReasons,
  ] = useState({});

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  const loadSafetyData =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const [
            actionData,
            appealData,
          ] = await Promise.all([
            getMyModerationActions(
              token
            ),

            getMyAppeals(
              token
            ),
          ]);

          setActions(
            actionData
          );

          setAppeals(
            appealData
          );
        } catch (loadError) {
          setError(
            loadError.message
          );
        } finally {
          setLoading(false);
        }
      },
      [token]
    );


  useEffect(() => {
    loadSafetyData();
  }, [loadSafetyData]);


  function getAppealForAction(
    actionId
  ) {
    return appeals.find(
      (appeal) =>
        appeal.moderation_action_id ===
        actionId
    );
  }


  async function handleAppeal(
    action
  ) {
    const reason =
      (
        appealReasons[
          action.id
        ] || ""
      ).trim();

    if (reason.length < 20) {
      setError(
        "Please explain your appeal in at least 20 characters."
      );

      return;
    }

    setBusyId(action.id);
    setMessage("");
    setError("");

    try {
      await createAppeal(
        token,
        action.id,
        reason
      );

      setAppealReasons(
        (current) => ({
          ...current,
          [action.id]: "",
        })
      );

      setMessage(
        "Your appeal was submitted for review."
      );

      await loadSafetyData();
    } catch (appealError) {
      setError(
        appealError.message
      );
    } finally {
      setBusyId(null);
    }
  }


  function statusLabel(status) {
    if (status === "pending") {
      return "Pending Review";
    }

    if (status === "accepted") {
      return "Appeal Accepted";
    }

    if (status === "denied") {
      return "Appeal Denied";
    }

    return status;
  }


  return (
    <main className="safety-center-page">
      <header className="safety-center-header">
        <div>
          <p className="small-title">
            GET CONNECTED
          </p>

          <h1>
            Safety & Appeals
          </h1>

          <p>
            Review account safety
            decisions and appeal one if
            you believe it should be
            reconsidered.
          </p>
        </div>

        <div className="safety-center-nav">
          <button
            type="button"
            onClick={onBack}
          >
            Back to Bulletin
          </button>

          <button
            type="button"
            className="safety-center-logout"
            onClick={onLogout}
          >
            Log Out
          </button>
        </div>
      </header>


      <section className="safety-privacy-note">
        <strong>
          Your privacy matters.
        </strong>

        <p>
          Appeals are about the
          moderation decision itself.
          Reporter identities and private
          reports are not shown here.
        </p>
      </section>


      {message && (
        <div className="safety-center-message">
          {message}
        </div>
      )}

      {error && (
        <div className="safety-center-error">
          {error}
        </div>
      )}


      <section className="safety-center-panel">
        <div className="safety-panel-heading">
          <p className="small-title">
            MY ACCOUNT
          </p>

          <h2>
            Moderation Decisions
          </h2>
        </div>


        {loading ? (
          <div className="safety-empty">
            Loading...
          </div>
        ) : actions.length === 0 ? (
          <div className="safety-empty">
            <h3>
              Nothing to review.
            </h3>

            <p>
              There are currently no
              moderation decisions on
              your account.
            </p>
          </div>
        ) : (
          <div className="safety-action-list">
            {actions.map(
              (action) => {
                const appeal =
                  getAppealForAction(
                    action.id
                  );

                return (
                  <article
                    className={
                      `student-moderation-card ` +
                      `student-moderation-${action.level}`
                    }
                    key={action.id}
                  >
                    <div className="student-moderation-heading">
                      <div>
                        <p className="small-title">
                          SAFETY NOTICE
                        </p>

                        <h3>
                          {action.level ===
                          "red"
                            ? "Red Safety Notice"
                            : "Yellow Safety Notice"}
                        </h3>
                      </div>

                      <span
                        className={
                          `student-action-status ` +
                          `action-status-${action.status}`
                        }
                      >
                        {action.status}
                      </span>
                    </div>


                    <div className="student-public-reason">
                      <strong>
                        Reviewed safety
                        reason
                      </strong>

                      <p>
                        {
                          action.public_summary
                        }
                      </p>
                    </div>


                    <p className="student-action-date">
                      Issued{" "}
                      {new Date(
                        action.created_at
                      ).toLocaleString()}
                    </p>


                    {action.status ===
                      "overturned" && (
                      <div className="appeal-accepted-box">
                        This decision has
                        been overturned and
                        is no longer active.
                      </div>
                    )}


                    {appeal ? (
                      <section className="existing-appeal-box">
                        <div className="existing-appeal-heading">
                          <strong>
                            Appeal
                          </strong>

                          <span
                            className={
                              `appeal-status ` +
                              `appeal-${appeal.status}`
                            }
                          >
                            {statusLabel(
                              appeal.status
                            )}
                          </span>
                        </div>

                        <p className="appeal-label">
                          Your explanation
                        </p>

                        <p>
                          {appeal.reason}
                        </p>

                        {appeal
                          .response_to_user && (
                          <>
                            <p className="appeal-label">
                              Admin response
                            </p>

                            <p>
                              {
                                appeal
                                  .response_to_user
                              }
                            </p>
                          </>
                        )}
                      </section>
                    ) : (
                      action.status ===
                        "active" && (
                        <section className="submit-appeal-box">
                          <h4>
                            Appeal this
                            decision
                          </h4>

                          <p>
                            Explain why you
                            believe this
                            moderation
                            decision should
                            be reconsidered.
                          </p>

                          <textarea
                            rows="6"
                            maxLength="3000"
                            value={
                              appealReasons[
                                action.id
                              ] || ""
                            }
                            onChange={(
                              event
                            ) =>
                              setAppealReasons(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  [action.id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder={
                              "Please explain why you believe this decision should be reviewed again..."
                            }
                          />

                          <div className="appeal-character-note">
                            Minimum 20
                            characters.
                          </div>

                          <button
                            type="button"
                            disabled={
                              busyId ===
                              action.id
                            }
                            onClick={() =>
                              handleAppeal(
                                action
                              )
                            }
                          >
                            {busyId ===
                            action.id
                              ? "Submitting..."
                              : "Submit Appeal"}
                          </button>
                        </section>
                      )
                    )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}


export default SafetyCenter;