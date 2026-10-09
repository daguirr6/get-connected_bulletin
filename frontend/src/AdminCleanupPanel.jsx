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
  getWeeklyAnalytics,
  removeAdminPostIt,
  setAdminUserStatus,
} from "./adminToolsApi";

import "./AdminCleanupPanel.css";


const pieColors = [
  "#006633",
  "#f2c230",
  "#3d7ea6",
  "#8c5aa8",
  "#d47d36",
  "#4f9a75",
  "#b54e5f",
  "#6472b5",
];


function formatDate(
  value
) {
  if (!value) {
    return "";
  }

  return new Date(
    `${value}T12:00:00`
  ).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  );
}


function AdminCleanupPanel({ token }) {
  const [postIts, setPostIts] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [
    analytics,
    setAnalytics,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [busyKey, setBusyKey] =
    useState(null);

  const [
    userSearch,
    setUserSearch,
  ] = useState("");


  const loadCleanupData =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const [
            postItData,
            userData,
            analyticsData,
          ] = await Promise.all([
            getAdminPostIts(
              token
            ),

            getAdminUsers(
              token
            ),

            getWeeklyAnalytics(
              token
            ),
          ]);

          setPostIts(
            postItData
          );

          setUsers(
            userData
          );

          setAnalytics(
            analyticsData
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
    loadCleanupData();
  }, [loadCleanupData]);


  const allStudentUsers =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.role !== "admin"
        ),
      [users]
    );


  const studentUsers =
    useMemo(
      () => {
        const query =
          userSearch
            .trim()
            .toLowerCase();

        if (!query) {
          return allStudentUsers;
        }

        return (
          allStudentUsers.filter(
            (user) =>
              [
                user.username,
                user.display_name ||
                  "",
                user.full_name ||
                  "",
                user.major ||
                  "",
                user.account_status,
                String(user.id),
              ].some(
                (value) =>
                  value
                    .toLowerCase()
                    .includes(
                      query
                    )
              )
          )
        );
      },
      [
        allStudentUsers,
        userSearch,
      ]
    );


  const maxDailyUsage =
    useMemo(
      () => {
        if (!analytics) {
          return 1;
        }

        return Math.max(
          1,
          ...analytics.days.flatMap(
            (day) => [
              day.this_week,
              day.last_week,
            ]
          )
        );
      },
      [analytics]
    );


  const pieBackground =
    useMemo(
      () => {
        if (
          !analytics ||
          analytics.times.length ===
            0
        ) {
          return null;
        }

        let start = 0;

        const segments =
          analytics.times.map(
            (item, index) => {
              const end =
                index ===
                analytics.times
                  .length -
                  1
                  ? 100
                  : start +
                    item.percentage;

              const color =
                pieColors[
                  index %
                    pieColors.length
                ];

              const segment =
                `${color} ` +
                `${start}% ` +
                `${end}%`;

              start = end;

              return segment;
            }
          );

        return (
          `conic-gradient(` +
          `${segments.join(
            ", "
          )})`
        );
      },
      [analytics]
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
      active:
        "restore",

      suspended:
        "suspend",

      removed:
        "remove access for",
    };

    const actionLabel =
      actionLabels[
        nextStatus
      ];

    const reason =
      window.prompt(
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

    const reason =
      window.prompt(
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

    if (
      typedUsername === null
    ) {
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
      <section className="admin-panel admin-cleanup-panel admin-analytics-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="small-title">
              WEEKLY SITE USAGE
            </p>

            <h2>
              Student Activity
            </h2>

            {analytics && (
              <p className="admin-cleanup-explainer">
                {formatDate(
                  analytics
                    .this_week_start
                )}{" "}
                –{" "}
                {formatDate(
                  analytics
                    .this_week_end
                )}
              </p>
            )}
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={
              loadCleanupData
            }
          >
            Refresh
          </button>
        </div>


        {loading ? (
          <div className="empty-state">
            Loading site usage...
          </div>
        ) : !analytics ? (
          <div className="empty-state">
            Usage information is not
            available.
          </div>
        ) : (
          <>
            <div className="admin-analytics-summary">
              <article className="admin-analytics-stat">
                <strong>
                  {
                    analytics
                      .this_week_unique_users
                  }
                </strong>

                <span>
                  Unique Students
                  This Week
                </span>
              </article>

              <article className="admin-analytics-stat">
                <strong>
                  {
                    analytics
                      .last_week_unique_users
                  }
                </strong>

                <span>
                  Unique Students
                  Last Week
                </span>
              </article>

              <article className="admin-analytics-stat">
                <strong>
                  {analytics
                    .busiest_day ||
                    "—"}
                </strong>

                <span>
                  Busiest Day
                </span>
              </article>

              <article className="admin-analytics-stat">
                <strong>
                  {analytics
                    .quietest_day ||
                    "—"}
                </strong>

                <span>
                  Quietest Day
                </span>
              </article>
            </div>


            <div className="admin-week-change">
              {analytics
                .weekly_change_percent ===
              null ? (
                <span>
                  No previous-week
                  comparison yet.
                </span>
              ) : (
                <span>
                  This week is{" "}
                  <strong>
                    {analytics
                      .weekly_change_percent >
                    0
                      ? "+"
                      : ""}
                    {
                      analytics
                        .weekly_change_percent
                    }
                    %
                  </strong>{" "}
                  compared with last
                  week.
                </span>
              )}
            </div>


            <div className="admin-analytics-grid">
              <section className="admin-chart-card">
                <div className="admin-chart-heading">
                  <div>
                    <p className="small-title">
                      DAILY UNIQUE USERS
                    </p>

                    <h3>
                      This Week vs.
                      Last Week
                    </h3>
                  </div>

                  <div className="admin-bar-legend">
                    <span>
                      <i className="admin-legend-this-week" />
                      This Week
                    </span>

                    <span>
                      <i className="admin-legend-last-week" />
                      Last Week
                    </span>
                  </div>
                </div>


                <div className="admin-bar-chart">
                  {analytics.days.map(
                    (day) => (
                      <div
                        className="admin-usage-day"
                        key={
                          day.day_name
                        }
                      >
                        <div className="admin-bar-area">
                          <div className="admin-bar-column">
                            <span className="admin-bar-value">
                              {
                                day.this_week
                              }
                            </span>

                            <div
                              className="admin-usage-bar admin-this-week-bar"
                              style={{
                                height:
                                  `${
                                    (
                                      day
                                        .this_week /
                                      maxDailyUsage
                                    ) *
                                    100
                                  }%`,
                              }}
                              title={
                                `${day.day_name}: ` +
                                `${day.this_week} ` +
                                `this week`
                              }
                            />
                          </div>

                          <div className="admin-bar-column">
                            <span className="admin-bar-value">
                              {
                                day.last_week
                              }
                            </span>

                            <div
                              className="admin-usage-bar admin-last-week-bar"
                              style={{
                                height:
                                  `${
                                    (
                                      day
                                        .last_week /
                                      maxDailyUsage
                                    ) *
                                    100
                                  }%`,
                              }}
                              title={
                                `${day.day_name}: ` +
                                `${day.last_week} ` +
                                `last week`
                              }
                            />
                          </div>
                        </div>

                        <strong className="admin-day-label">
                          {day.day_name
                            .slice(
                              0,
                              3
                            )}
                        </strong>
                      </div>
                    )
                  )}
                </div>

                <p className="admin-chart-note">
                  Each student counts
                  only once per day,
                  even if they return
                  several times.
                </p>
              </section>


              <section className="admin-chart-card">
                <div className="admin-chart-heading">
                  <div>
                    <p className="small-title">
                      FIRST ACTIVE TIME
                    </p>

                    <h3>
                      Most Common
                      Visit Times
                    </h3>
                  </div>
                </div>


                {analytics.times
                  .length === 0 ? (
                  <div className="admin-chart-empty">
                    No student activity
                    has been recorded
                    this week yet.
                  </div>
                ) : (
                  <div className="admin-pie-layout">
                    <div
                      className="admin-usage-pie"
                      style={{
                        background:
                          pieBackground,
                      }}
                      aria-label="Site usage time pie chart"
                    >
                      <div className="admin-pie-center">
                        <strong>
                          {
                            analytics
                              .this_week_unique_users
                          }
                        </strong>

                        <span>
                          weekly
                          students
                        </span>
                      </div>
                    </div>

                    <div className="admin-pie-legend">
                      {analytics.times.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            className="admin-pie-row"
                            key={
                              item.hour
                            }
                          >
                            <i
                              style={{
                                background:
                                  pieColors[
                                    index %
                                      pieColors.length
                                  ],
                              }}
                            />

                            <span>
                              {
                                item.label
                              }
                            </span>

                            <strong>
                              {
                                item.percentage
                              }
                              %
                            </strong>

                            <small>
                              {
                                item.count
                              }{" "}
                              {item.count ===
                              1
                                ? "student-day"
                                : "student-days"}
                            </small>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                <p className="admin-chart-note">
                  A student contributes
                  one first-use time per
                  day, so repeated
                  logins do not inflate
                  daily usage totals.
                </p>
              </section>
            </div>
          </>
        )}
      </section>


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
              delete the student&apos;s
              account, profile,
              connections, or messages.
            </p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={
              loadCleanupData
            }
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
        ) : postIts.length ===
          0 ? (
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
                      POST-IT #
                      {postIt.id}
                    </p>

                    <h3>
                      {
                        postIt.display_name
                      }
                    </h3>

                    <p>
                      <strong>
                        Username:
                      </strong>{" "}
                      {
                        postIt.username
                      }
                    </p>

                    <p>
                      <strong>
                        Major:
                      </strong>{" "}
                      {postIt.major}
                    </p>

                    <p className="admin-post-preview">
                      {
                        postIt.fun_facts
                      }
                    </p>

                    <small>
                      Song:{" "}
                      {
                        postIt.song_title
                      }
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
              Student Accounts (
              {
                allStudentUsers.length
              }
              )
            </h2>

            <p className="admin-cleanup-explainer">
              Suspend or remove access
              for moderation. Permanent
              deletion should only be
              used for test, duplicate,
              or approved data-deletion
              accounts.
            </p>
          </div>
        </div>


        <label className="admin-user-search">
          Search students

          <input
            type="search"
            value={
              userSearch
            }
            onChange={(event) =>
              setUserSearch(
                event.target.value
              )
            }
            placeholder="Username, user ID, legal name, display name, major..."
          />
        </label>


        {loading ? (
          <div className="empty-state">
            Loading students...
          </div>
        ) : studentUsers.length ===
          0 ? (
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
                        {
                          user.account_status
                        }
                      </span>
                    </div>

                    <p>
                      <strong>
                        Username:
                      </strong>{" "}
                      {
                        user.username
                      }
                    </p>

                    <p>
                      <strong>
                        User ID:
                      </strong>{" "}
                      #{user.id}
                    </p>

                    <p>
                      <strong>
                        Legal name:
                      </strong>{" "}
                      {user.full_name ||
                        "Unknown"}
                    </p>

                    <p>
                      <strong>
                        Major:
                      </strong>{" "}
                      {user.major ||
                        "Unknown"}
                    </p>

                    <p>
                      <strong>
                        Verification:
                      </strong>{" "}
                      {
                        user
                          .verification_status
                      }
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