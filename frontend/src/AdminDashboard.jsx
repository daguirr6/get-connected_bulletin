import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getPendingVerifications,
  reviewVerification,
} from "./api";


function AdminDashboard({
  token,
  username,
  onLogout,
}) {
  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [busyId, setBusyId] =
    useState(null);


  const loadRequests = useCallback(
    async () => {
      setLoading(true);

      try {
        const data =
          await getPendingVerifications(
            token
          );

        setRequests(data);
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );


  useEffect(() => {
    loadRequests();
  }, [loadRequests]);


  async function handleVerify(
    verificationId
  ) {
    setBusyId(verificationId);
    setMessage("");

    try {
      await reviewVerification(
        token,
        verificationId,
        "verified",
        null
      );

      setMessage(
        "Student verified successfully!"
      );

      await loadRequests();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }


  async function handleNeedsInfo(
    verificationId
  ) {
    const note = window.prompt(
      "What additional information does this student need to provide?"
    );

    if (
      note === null ||
      !note.trim()
    ) {
      return;
    }

    setBusyId(verificationId);
    setMessage("");

    try {
      await reviewVerification(
        token,
        verificationId,
        "needs_info",
        note.trim()
      );

      setMessage(
        "Student marked as needing more information."
      );

      await loadRequests();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId(null);
    }
  }


  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="small-title">
            GET CONNECTED ADMIN
          </p>

          <h1>Admin Dashboard</h1>

          <p className="admin-welcome">
            Welcome, {username}.
          </p>
        </div>

        <button
          className="admin-logout"
          type="button"
          onClick={onLogout}
        >
          Log Out
        </button>
      </header>


      <section className="admin-summary">
        <article className="summary-card">
          <span className="summary-number">
            {requests.length}
          </span>

          <span className="summary-label">
            Pending Students
          </span>
        </article>

        <article className="summary-card muted">
          <span className="summary-number">
            —
          </span>

          <span className="summary-label">
            Pending Profiles
          </span>
        </article>

        <article className="summary-card muted">
          <span className="summary-number">
            —
          </span>

          <span className="summary-label">
            Reports
          </span>
        </article>

        <article className="summary-card muted">
          <span className="summary-number">
            —
          </span>

          <span className="summary-label">
            Appeals
          </span>
        </article>
      </section>


      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="small-title">
              STUDENT VERIFICATION
            </p>

            <h2>
              Pending Verifications
            </h2>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={loadRequests}
          >
            Refresh
          </button>
        </div>


        {message && (
          <p className="admin-message">
            {message}
          </p>
        )}


        {loading ? (
          <div className="empty-state">
            <p>
              Loading students...
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <h3>All caught up!</h3>

            <p>
              There are currently no
              students waiting for
              verification.
            </p>
          </div>
        ) : (
          <div className="verification-list">
            {requests.map((request) => (
              <article
                className="verification-card"
                key={request.id}
              >
                <div className="verification-info">
                  <h3>
                    {request.full_name}
                  </h3>

                  <p>
                    <strong>
                      Major:
                    </strong>{" "}
                    {request.major}
                  </p>

                  <p className="verification-id">
                    Student account ID:{" "}
                    {request.user_id}
                  </p>

                  <p className="submitted-date">
                    Submitted{" "}
                    {new Date(
                      request.submitted_at
                    ).toLocaleString()}
                  </p>
                </div>


                <div className="verification-actions">
                  <button
                    className="verify-button"
                    type="button"
                    disabled={
                      busyId === request.id
                    }
                    onClick={() =>
                      handleVerify(
                        request.id
                      )
                    }
                  >
                    {busyId === request.id
                      ? "Working..."
                      : "Verify Student"}
                  </button>

                  <button
                    className="needs-info-button"
                    type="button"
                    disabled={
                      busyId === request.id
                    }
                    onClick={() =>
                      handleNeedsInfo(
                        request.id
                      )
                    }
                  >
                    Needs Info
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}


export default AdminDashboard;