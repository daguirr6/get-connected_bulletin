import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  deleteAdminUser,
  getAdminPostIts,
  getAdminUsers,
  removeAdminPostIt,
  setAdminUserStatus,
} from "./adminToolsApi";

import "./AdminCleanupPanel.css";


function AdminCleanupPanel({ token }) {
  const [postIts, setPostIts] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [busyKey, setBusyKey] =
    useState(null);

  const [userSearch, setUserSearch] =
    useState("");


  const loadCleanupData =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const [
            postItData,
            userData,
          ] = await Promise.all([
            getAdminPostIts(token),
            getAdminUsers(token),
          ]);

          setPostIts(postItData);
          setUsers(userData);
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
    loadCleanupData();
  }, [loadCleanupData]);


  const studentUsers =
    useMemo(
      () => {
        const query =
          userSearch
            .trim()
            .toLowerCase();

        return users.filter(
          (user) => {
            if (
              user.role === "admin"
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              user.username,
              user.display_name || "",
              user.full_name || "",
              user.major || "",
              user.account_status,
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query)
            );
          }
        );
      },
      [users, userSearch]
    );


  async function handleRemovePostIt(
    postIt
  ) {
    const reason = window.prompt(
      "Why are you removing this Post-it? This reason is kept for the admin record."
    );

    if (
      reason === null ||
      reason.trim().length < 3
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${postIt.display_name}'s Post-it from the bulletin?\n\nTheir account, profile, connections, and messages will remain.`
      );

    if (!confirmed) {
      return;
    }

    setBusyKey(
      `post-${postIt.id}`
    );

    setMessage("");
    setError("");

    try {
      await removeAdminPostIt(
        token,
        postIt.id,
        reason.trim()
      );

      setMessage(
        `${postIt.display_name}'s Post-it was removed.`
      );

      await loadCleanupData();
    } catch (actionError) {
      setError(
        actionError.message
      );
    } finally {
      setBusyKey(null);
    }
  }


  async function changeUserStatus(
    user,
    nextStatus
  ) {
    const actionLabels = {
      active: "restore",
      suspended: "suspend",
      removed: "remove access for",
    };

    const actionLabel =
      actionLabels[nextStatus];

    const reason = window.prompt(
      `Why do you want to ${actionLabel} ${user.username}?`
    );

    if (
      reason === null ||
      reason.trim().length < 3
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Confirm account status change for ${user.username}: ${user.account_status} -> ${nextStatus}?`
      );

    if (!confirmed) {
      return;
    }

    setBusyKey(
      `user-${user.id}`
    );

    setMessage("");
    setError("");

    try {
      await setAdminUserStatus(
        token,
        user.id,
        nextStatus,
        reason.trim()
      );

      setMessage(
        `${user.username} is now ${nextStatus}.`
      );

      await loadCleanupData();
    } catch (actionError) {
      setError(
        actionError.message
      );
    } finally {
      setBusyKey(null);
    }
  }


  async function handleDeleteUser(
    user
  ) {
    setMessage("");
    setError("");

    const reason = window.prompt(
      `Why are you permanently deleting ${user.username}?\n\nUse permanent deletion for test accounts, duplicate accounts, or approved data-deletion requests.`
    );

    if (
      reason === null ||
      reason.trim().length < 3
    ) {
      return;
    }

    const typedUsername =
      window.prompt(
        `PERMANENT DELETION\n\nThis cannot be undone.\n\nType the username exactly to confirm:\n\n${user.username}`
      );

    if (typedUsername === null) {
      return;
    }

    if (
      typedUsername.trim() !==
      user.username
    ) {
      setError(
        `Deletion cancelled. You must type "${user.username}" exactly.`
      );

      return;
    }

    const finalConfirmation =
      window.confirm(
        `Permanently delete ${user.username}?\n\nThis will delete the account and database records tied to it. This action cannot be undone.`
      );

    if (!finalConfirmation) {
      return;
    }

    setBusyKey(
      `delete-user-${user.id}`
    );

    try {
      await deleteAdminUser(
        token,
        user.id,
        typedUsername.trim(),
        reason.trim()
      );

      setMessage(
        `${user.username} was permanently deleted.`
      );

      await loadCleanupData();
    } catch (actionError) {
      setError(
        actionError.message
      );
    } finally {
      setBusyKey(null);
    }
  }


  return (
    <>
      <section className="admin-panel admin-cleanup-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="small-title">
              BULLETIN MANAGEMENT
            </p>

            <h2>
              Current Post-its
            </h2>

            <p className="admin-cleanup-explainer">
              Removing a Post-it does not
              delete the student&apos;s account,
              profile, connections, or messages.
            </p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={loadCleanupData}
          >
            Refresh
          </button>
        </div>

        {message && (
          <div className="admin-cleanup-message">
            {message}
          </div>
        )}

        {error && (
          <div className="admin-cleanup-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            Loading Post-its...
          </div>
        ) : postIts.length === 0 ? (
          <div className="empty-state">
            No Post-its are currently
            on the bulletin.
          </div>
        ) : (
          <div className="admin-cleanup-list">
            {postIts.map(
              (postIt) => (
                <article
                  className="admin-cleanup-card"
                  key={postIt.id}
                >
                  <div>
                    <p className="small-title">
                      POST-IT #{postIt.id}
                    </p>

                    <h3>
                      {postIt.display_name}
                    </h3>

                    <p>
                      <strong>
                        Username:
                      </strong>{" "}
                      {postIt.username}
                    </p>

                    <p>
                      <strong>
                        Major:
                      </strong>{" "}
                      {postIt.major}
                    </p>

                    <p className="admin-post-preview">
                      {postIt.fun_facts}
                    </p>

                    <small>
                      Song: {postIt.song_title}
                      {postIt.song_artist
                        ? ` — ${postIt.song_artist}`
                        : ""}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="admin-danger-button"
                    disabled={
                      busyKey ===
                      `post-${postIt.id}`
                    }
                    onClick={() =>
                      handleRemovePostIt(
                        postIt
                      )
                    }
                  >
                    {busyKey ===
                    `post-${postIt.id}`
                      ? "Removing..."
                      : "Remove Post-it"}
                  </button>
                </article>
              )
            )}
          </div>
        )}
      </section>


      <section className="admin-panel admin-cleanup-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="small-title">
              ACCOUNT MANAGEMENT
            </p>

            <h2>
              Student Accounts
            </h2>

            <p className="admin-cleanup-explainer">
              Suspend or remove access for
              moderation. Permanent deletion
              should only be used for test,
              duplicate, or approved
              data-deletion accounts.
            </p>
          </div>
        </div>

        <label className="admin-user-search">
          Search students

          <input
            type="search"
            value={userSearch}
            onChange={(event) =>
              setUserSearch(
                event.target.value
              )
            }
            placeholder="Username, legal name, display name, major..."
          />
        </label>

        {loading ? (
          <div className="empty-state">
            Loading students...
          </div>
        ) : studentUsers.length === 0 ? (
          <div className="empty-state">
            No matching students.
          </div>
        ) : (
          <div className="admin-cleanup-list">
            {studentUsers.map(
              (user) => (
                <article
                  className="admin-cleanup-card"
                  key={user.id}
                >
                  <div>
                    <div className="admin-account-heading">
                      <h3>
                        {user.display_name ||
                          user.username}
                      </h3>

                      <span
                        className={
                          `admin-account-status ` +
                          `admin-account-${user.account_status}`
                        }
                      >
                        {user.account_status}
                      </span>
                    </div>

                    <p>
                      <strong>
                        Username:
                      </strong>{" "}
                      {user.username}
                    </p>

                    <p>
                      <strong>
                        Legal name:
                      </strong>{" "}
                      {user.full_name || "Unknown"}
                    </p>

                    <p>
                      <strong>
                        Major:
                      </strong>{" "}
                      {user.major || "Unknown"}
                    </p>

                    <p>
                      <strong>
                        Verification:
                      </strong>{" "}
                      {user.verification_status}
                    </p>
                  </div>

                  <div className="admin-account-actions">
                    {user.account_status !==
                      "active" && (
                      <button
                        type="button"
                        className="admin-restore-button"
                        disabled={
                          busyKey ===
                          `user-${user.id}` ||
                          busyKey ===
                          `delete-user-${user.id}`
                        }
                        onClick={() =>
                          changeUserStatus(
                            user,
                            "active"
                          )
                        }
                      >
                        Restore
                      </button>
                    )}

                    {user.account_status ===
                      "active" && (
                      <button
                        type="button"
                        className="admin-suspend-button"
                        disabled={
                          busyKey ===
                          `user-${user.id}` ||
                          busyKey ===
                          `delete-user-${user.id}`
                        }
                        onClick={() =>
                          changeUserStatus(
                            user,
                            "suspended"
                          )
                        }
                      >
                        Suspend
                      </button>
                    )}

                    {user.account_status !==
                      "removed" && (
                      <button
                        type="button"
                        className="admin-danger-button"
                        disabled={
                          busyKey ===
                          `user-${user.id}` ||
                          busyKey ===
                          `delete-user-${user.id}`
                        }
                        onClick={() =>
                          changeUserStatus(
                            user,
                            "removed"
                          )
                        }
                      >
                        Remove Access
                      </button>
                    )}

                    <button
                      type="button"
                      className="admin-danger-button"
                      disabled={
                        busyKey ===
                        `user-${user.id}` ||
                        busyKey ===
                        `delete-user-${user.id}`
                      }
                      onClick={() =>
                        handleDeleteUser(
                          user
                        )
                      }
                    >
                      {busyKey ===
                      `delete-user-${user.id}`
                        ? "Deleting..."
                        : "Delete Permanently"}
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </>
  );
}


export default AdminCleanupPanel;