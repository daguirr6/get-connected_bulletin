import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getPendingProfiles,
  getPendingReports,
  getPendingVerifications,
  reviewProfile,
  reviewReport,
  reviewVerification,
} from "./api";

import {
  getPendingAppeals,
  reviewAppeal,
} from "./appealsApi";

import AdminCleanupPanel from "./AdminCleanupPanel";

import "./AdminDashboard.css";


const yearLabels = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  graduate: "Graduate Student",
  other: "Other",
  prefer_not_to_say:
    "Prefer not to say",
};


const categoryLabels = {
  harassment:
    "Harassment",

  unwanted_messages:
    "Unwanted messages",

  threatening_behavior:
    "Threatening behavior",

  inappropriate_content:
    "Inappropriate content",

  impersonation:
    "Impersonation",

  spam:
    "Spam",

  other:
    "Other",
};


const publicSafetyOptions = [
  "Repeated unwanted messaging",
  "Harassment or disrespectful communication",
  "Threatening or intimidating behavior",
  "Inappropriate content",
  "Impersonation concerns",
  "Spam or disruptive behavior",
  "Other reviewed safety concern",
];


function AdminDashboard({
  token,
  username,
  onLogout,
}) {
  const [
    verificationRequests,
    setVerificationRequests,
  ] = useState([]);

  const [
    profileRequests,
    setProfileRequests,
  ] = useState([]);

  const [
    reportRequests,
    setReportRequests,
  ] = useState([]);

  const [
    appealRequests,
    setAppealRequests,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [busyId, setBusyId] =
    useState(null);

  const [
    selectedProfile,
    setSelectedProfile,
  ] = useState(null);

  const [
    selectedReport,
    setSelectedReport,
  ] = useState(null);

  const [
    selectedAppeal,
    setSelectedAppeal,
  ] = useState(null);

  const [
    changeNote,
    setChangeNote,
  ] = useState("");

  const [
    moderationLevel,
    setModerationLevel,
  ] = useState("");

  const [
    publicSummary,
    setPublicSummary,
  ] = useState("");

  const [
    privateAdminNote,
    setPrivateAdminNote,
  ] = useState("");

  const [
    appealResponse,
    setAppealResponse,
  ] = useState("");

  const [
    appealPrivateNote,
    setAppealPrivateNote,
  ] = useState("");


  const loadDashboard =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const [
            verifications,
            profiles,
            reports,
            appeals,
          ] = await Promise.all([
            getPendingVerifications(
              token
            ),

            getPendingProfiles(
              token
            ),

            getPendingReports(
              token
            ),

            getPendingAppeals(
              token
            ),
          ]);

          setVerificationRequests(
            verifications
          );

          setProfileRequests(
            profiles
          );

          setReportRequests(
            reports
          );

          setAppealRequests(
            appeals
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
    loadDashboard();
  }, [loadDashboard]);


  async function handleVerify(
    verificationId
  ) {
    setBusyId(
      `verification-${verificationId}`
    );

    setMessage("");
    setError("");

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

      await loadDashboard();
    } catch (actionError) {
      setError(
        actionError.message
      );
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

    setBusyId(
      `verification-${verificationId}`
    );

    setMessage("");
    setError("");

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

      await loadDashboard();
    } catch (actionError) {
      setError(
        actionError.message
      );
    } finally {
      setBusyId(null);
    }
  }


  async function handleApproveProfile(
    profile
  ) {
    setBusyId(
      `profile-${profile.id}`
    );

    setMessage("");
    setError("");

    try {
      await reviewProfile(
        token,
        profile.id,
        "approved",
        null
      );

      setSelectedProfile(null);
      setChangeNote("");

      setMessage(
        `${profile.display_name}'s profile was approved!`
      );

      await loadDashboard();
    } catch (actionError) {
      setError(
        actionError.message
      );
    } finally {
      setBusyId(null);
    }
  }


  async function handleNeedsChanges(
    profile
  ) {
    const note =
      changeNote.trim();

    if (!note) {
      setError(
        "Please explain what the student needs to change."
      );

      return;
    }

    setBusyId(
      `profile-${profile.id}`
    );

    setMessage("");
    setError("");

    try {
      await reviewProfile(
        token,
        profile.id,
        "needs_changes",
        note
      );

      setSelectedProfile(null);
      setChangeNote("");

      setMessage(
        `${profile.display_name}'s profile was returned for changes.`
      );

      await loadDashboard();
    } catch (actionError) {
      setError(
        actionError.message
      );
    } finally {
      setBusyId(null);
    }
  }


  function openProfileReview(
    profile
  ) {
    setSelectedProfile(
      profile
    );

    setChangeNote("");
    setError("");
  }


  function openReportReview(
    report
  ) {
    setSelectedReport(
      report
    );

    setModerationLevel("");
    setPublicSummary("");
    setPrivateAdminNote("");
    setError("");
  }


  function closeReportReview() {
    setSelectedReport(null);
    setModerationLevel("");
    setPublicSummary("");
    setPrivateAdminNote("");
  }


  async function handleDismissReport(
    report
  ) {
    setBusyId(
      `report-${report.id}`
    );

    setMessage("");
    setError("");

    try {
      await reviewReport(
        token,
        report.id,
        {
          decision: "dismissed",
          level: null,
          public_summary: null,
          private_admin_note:
            privateAdminNote.trim() ||
            null,
        }
      );

      closeReportReview();

      setMessage(
        "Report dismissed. No public safety notice was created."
      );

      await loadDashboard();
    } catch (actionError) {
      setError(
        actionError.message
      );
    } finally {
      setBusyId(null);
    }
  }


  async function handleUpholdReport(
    report
  ) {
    if (!moderationLevel) {
      setError(
        "Choose yellow or red before upholding this report."
      );

      return;
    }

    if (!publicSummary) {
      setError(
        "Choose a public safety reason before upholding this report."
      );

      return;
    }

    setBusyId(
      `report-${report.id}`
    );

    setMessage("");
    setError("");

    try {
      await reviewReport(
        token,
        report.id,
        {
          decision: "upheld",

          level:
            moderationLevel,

          public_summary:
            publicSummary,

          private_admin_note:
            privateAdminNote.trim() ||
            null,
        }
      );

      closeReportReview();

      setMessage(
        `Report upheld. A ${moderationLevel} safety notice was created.`
      );

      await loadDashboard();
    } catch (actionError) {
      setError(
        actionError.message
      );
    } finally {
      setBusyId(null);
    }
  }


  function openAppealReview(
    appeal
  ) {
    setSelectedAppeal(
      appeal
    );

    setAppealResponse("");
    setAppealPrivateNote("");
    setError("");
  }


  function closeAppealReview() {
    setSelectedAppeal(null);
    setAppealResponse("");
    setAppealPrivateNote("");
  }


  async function handleAppealDecision(
    appeal,
    decision
  ) {
    const response =
      appealResponse.trim();

    if (response.length < 3) {
      setError(
        "Please write a response to the student before reviewing the appeal."
      );

      return;
    }

    setBusyId(
      `appeal-${appeal.id}`
    );

    setMessage("");
    setError("");

    try {
      await reviewAppeal(
        token,
        appeal.id,
        decision,
        response,
        appealPrivateNote.trim() ||
          null
      );

      closeAppealReview();

      if (
        decision === "accepted"
      ) {
        setMessage(
          "Appeal accepted. The moderation action was overturned."
        );
      } else {
        setMessage(
          "Appeal denied. The moderation action remains in place."
        );
      }

      await loadDashboard();
    } catch (actionError) {
      setError(
        actionError.message
      );
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

          <h1>
            Admin Dashboard
          </h1>

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
            {
              verificationRequests.length
            }
          </span>

          <span className="summary-label">
            Pending Students
          </span>
        </article>

        <article className="summary-card">
          <span className="summary-number">
            {
              profileRequests.length
            }
          </span>

          <span className="summary-label">
            Pending Profiles
          </span>
        </article>

        <article className="summary-card">
          <span className="summary-number">
            {
              reportRequests.length
            }
          </span>

          <span className="summary-label">
            Reports
          </span>
        </article>

        <article className="summary-card">
          <span className="summary-number">
            {
              appealRequests.length
            }
          </span>

          <span className="summary-label">
            Appeals
          </span>
        </article>
      </section>


      {message && (
        <div className="admin-success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="admin-error-message">
          {error}
        </div>
      )}


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
            onClick={
              loadDashboard
            }
          >
            Refresh
          </button>
        </div>


        {loading ? (
          <div className="empty-state">
            Loading students...
          </div>
        ) : verificationRequests
            .length === 0 ? (
          <div className="empty-state">
            <h3>
              All caught up!
            </h3>

            <p>
              There are currently no
              students waiting for
              verification.
            </p>
          </div>
        ) : (
          <div className="verification-list">
            {verificationRequests.map(
              (request) => (
                <article
                  className="verification-card"
                  key={request.id}
                >
                  <div className="verification-info">
                    <h3>
                      {
                        request.full_name
                      }
                    </h3>

                    <p>
                      <strong>
                        Major:
                      </strong>{" "}
                      {request.major}
                    </p>

                    <p className="verification-id">
                      Student account ID:{" "}
                      {
                        request.user_id
                      }
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
                        busyId ===
                        `verification-${request.id}`
                      }
                      onClick={() =>
                        handleVerify(
                          request.id
                        )
                      }
                    >
                      Verify Student
                    </button>

                    <button
                      className="needs-info-button"
                      type="button"
                      disabled={
                        busyId ===
                        `verification-${request.id}`
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
              )
            )}
          </div>
        )}
      </section>


      <section className="admin-panel profile-review-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="small-title">
              PROFILE MODERATION
            </p>

            <h2>
              Pending Profiles
            </h2>
          </div>
        </div>


        {loading ? (
          <div className="empty-state">
            Loading profiles...
          </div>
        ) : profileRequests.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              No profiles waiting!
            </h3>

            <p>
              Student profiles submitted
              for review will appear here.
            </p>
          </div>
        ) : (
          <div className="admin-profile-list">
            {profileRequests.map(
              (profile) => (
                <article
                  className="admin-profile-card"
                  key={profile.id}
                >
                  <div className="admin-profile-person">
                    {profile.profile_picture_url ? (
                      <img
                        src={
                          profile.profile_picture_url
                        }
                        alt=""
                      />
                    ) : (
                      <div className="admin-profile-placeholder">
                        {profile.display_name
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div>
                      <p className="small-title">
                        PROFILE REVIEW
                      </p>

                      <h3>
                        {
                          profile.display_name
                        }
                      </h3>

                      <p>
                        {profile.major}
                      </p>

                      <small>
                        Username:{" "}
                        {profile.username}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="admin-preview-button"
                    onClick={() =>
                      openProfileReview(
                        profile
                      )
                    }
                  >
                    Preview Profile
                  </button>
                </article>
              )
            )}
          </div>
        )}
      </section>


      <section className="admin-panel safety-review-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="small-title">
              SAFETY & MODERATION
            </p>

            <h2>
              Pending Reports
            </h2>
          </div>
        </div>


        {loading ? (
          <div className="empty-state">
            Loading reports...
          </div>
        ) : reportRequests.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              No reports waiting.
            </h3>

            <p>
              New safety reports will
              appear here for review.
            </p>
          </div>
        ) : (
          <div className="admin-report-list">
            {reportRequests.map(
              (report) => (
                <article
                  className="admin-report-card"
                  key={report.id}
                >
                  <div>
                    <p className="small-title">
                      SAFETY REPORT
                    </p>

                    <h3>
                      Report concerning{" "}
                      {
                        report.reported_username
                      }
                    </h3>

                    <p>
                      <strong>
                        Category:
                      </strong>{" "}
                      {
                        categoryLabels[
                          report.category
                        ] ||
                        report.category
                      }
                    </p>

                    <p className="submitted-date">
                      Submitted{" "}
                      {new Date(
                        report.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-report-review-button"
                    onClick={() =>
                      openReportReview(
                        report
                      )
                    }
                  >
                    Review Report
                  </button>
                </article>
              )
            )}
          </div>
        )}
      </section>


      <section className="admin-panel appeal-review-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="small-title">
              APPEALS
            </p>

            <h2>
              Pending Appeals
            </h2>
          </div>
        </div>


        {loading ? (
          <div className="empty-state">
            Loading appeals...
          </div>
        ) : appealRequests.length ===
          0 ? (
          <div className="empty-state">
            <h3>
              No appeals waiting.
            </h3>

            <p>
              Student appeals of
              moderation decisions will
              appear here.
            </p>
          </div>
        ) : (
          <div className="admin-appeal-list">
            {appealRequests.map(
              (appeal) => (
                <article
                  className={
                    `admin-appeal-card ` +
                    `admin-appeal-${appeal.moderation_level}`
                  }
                  key={appeal.id}
                >
                  <div>
                    <p className="small-title">
                      MODERATION APPEAL
                    </p>

                    <h3>
                      Appeal from{" "}
                      {appeal.username}
                    </h3>

                    <p>
                      <strong>
                        Original level:
                      </strong>{" "}
                      {
                        appeal.moderation_level
                      }
                    </p>

                    <p>
                      <strong>
                        Public reason:
                      </strong>{" "}
                      {
                        appeal.public_summary
                      }
                    </p>

                    <p className="submitted-date">
                      Submitted{" "}
                      {new Date(
                        appeal.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-appeal-review-button"
                    onClick={() =>
                      openAppealReview(
                        appeal
                      )
                    }
                  >
                    Review Appeal
                  </button>
                </article>
              )
            )}
          </div>
        )}
      </section>


      <AdminCleanupPanel
        token={token}
      />


      {selectedProfile && (
        <div
          className="admin-review-backdrop"
          onMouseDown={() => {
            setSelectedProfile(
              null
            );

            setChangeNote("");
          }}
        >
          <section
            className="admin-profile-review-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="admin-review-close"
              type="button"
              onClick={() => {
                setSelectedProfile(
                  null
                );

                setChangeNote("");
              }}
            >
              ├ù
            </button>

            <div className="admin-review-heading">
              <p className="small-title">
                PROFILE REVIEW
              </p>

              <h2>
                {
                  selectedProfile.display_name
                }
              </h2>

              <p>
                {selectedProfile.major}
              </p>

              <p className="submitted-date">
                Submitted{" "}
                {selectedProfile
                  .submitted_at
                  ? new Date(
                      selectedProfile
                        .submitted_at
                    ).toLocaleString()
                  : "recently"}
              </p>
            </div>

            <div className="admin-review-grid">
              <aside>
                {selectedProfile
                  .profile_picture_url ? (
                  <img
                    className="admin-review-photo"
                    src={
                      selectedProfile
                        .profile_picture_url
                    }
                    alt=""
                  />
                ) : (
                  <div className="admin-review-photo admin-review-photo-placeholder">
                    {selectedProfile
                      .display_name
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <section className="admin-review-box">
                  <h3>
                    Connection Card
                  </h3>

                  <p>
                    <strong>
                      Name:
                    </strong>{" "}
                    {
                      selectedProfile
                        .display_name
                    }
                  </p>

                  <p>
                    <strong>
                      Major:
                    </strong>{" "}
                    {
                      selectedProfile
                        .major
                    }
                  </p>

                  <p>
                    <strong>
                      Year:
                    </strong>{" "}
                    {yearLabels[
                      selectedProfile
                        .class_year
                    ] ||
                      "Not provided"}
                  </p>

                  <p>
                    <strong>
                      Where they're headed:
                    </strong>{" "}
                    {
                      selectedProfile
                        .aspiration ||
                      "Not provided"
                    }
                  </p>
                </section>

                <section className="admin-review-box">
                  <h3>
                    Interests
                  </h3>

                  <p>
                    {
                      selectedProfile
                        .interests ||
                      "None provided"
                    }
                  </p>
                </section>

                <section className="admin-review-box">
                  <h3>
                    Appearance
                  </h3>

                  <p>
                    Theme:{" "}
                    {
                      selectedProfile
                        .background_style ||
                      "paper"
                    }
                  </p>

                  <p>
                    Font:{" "}
                    {
                      selectedProfile
                        .font_style ||
                      "arial"
                    }
                  </p>
                </section>
              </aside>

              <div className="admin-review-main">
                <section className="admin-review-box gold-heading">
                  <h3>
                    Looking to Connect For
                  </h3>

                  <p>
                    {
                      selectedProfile
                        .looking_for ||
                      "Nothing selected"
                    }
                  </p>
                </section>

                <section className="admin-review-box gold-heading">
                  <h3>
                    Ask Me About
                  </h3>

                  <p>
                    {
                      selectedProfile
                        .ask_me_about ||
                      "Nothing provided"
                    }
                  </p>
                </section>

                <section className="admin-review-box">
                  <h3>
                    About Me
                  </h3>

                  <p>
                    {
                      selectedProfile
                        .about_me ||
                      "Nothing provided"
                    }
                  </p>
                </section>

                <section className="admin-review-box">
                  <h3>
                    Current Obsession
                  </h3>

                  <p>
                    {
                      selectedProfile
                        .current_obsession ||
                      "Nothing provided"
                    }
                  </p>
                </section>

                <section className="admin-review-box">
                  <h3>
                    Favorite Quote
                  </h3>

                  <p>
                    {
                      selectedProfile
                        .favorite_quote ||
                      "Nothing provided"
                    }
                  </p>
                </section>

                <section className="admin-review-box">
                  <h3>
                    Songs
                  </h3>

                  {selectedProfile.songs
                    .length === 0 ? (
                    <p>
                      No songs added.
                    </p>
                  ) : (
                    <ol className="admin-review-songs">
                      {selectedProfile.songs.map(
                        (song) => (
                          <li key={song.id}>
                            <strong>
                              {song.title}
                            </strong>{" "}
                            ΓÇö {song.artist}
                          </li>
                        )
                      )}
                    </ol>
                  )}
                </section>
              </div>
            </div>

            <section className="admin-review-decision">
              <h3>
                Review Decision
              </h3>

              <p>
                If something needs to
                change, explain it below.
                The student will see this
                note in their profile
                editor.
              </p>

              <textarea
                rows="4"
                maxLength="1000"
                value={changeNote}
                onChange={(event) =>
                  setChangeNote(
                    event.target.value
                  )
                }
              />

              <div className="admin-review-buttons">
                <button
                  type="button"
                  className="admin-needs-changes"
                  disabled={
                    busyId ===
                      `profile-${selectedProfile.id}` ||
                    !changeNote.trim()
                  }
                  onClick={() =>
                    handleNeedsChanges(
                      selectedProfile
                    )
                  }
                >
                  Needs Changes
                </button>

                <button
                  type="button"
                  className="admin-approve-profile"
                  disabled={
                    busyId ===
                    `profile-${selectedProfile.id}`
                  }
                  onClick={() =>
                    handleApproveProfile(
                      selectedProfile
                    )
                  }
                >
                  Approve Profile
                </button>
              </div>
            </section>
          </section>
        </div>
      )}


      {selectedReport && (
        <div
          className="admin-review-backdrop"
          onMouseDown={
            closeReportReview
          }
        >
          <section
            className="admin-report-review-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="admin-review-close"
              type="button"
              onClick={
                closeReportReview
              }
            >
              ├ù
            </button>

            <div className="admin-review-heading safety-heading">
              <p className="small-title">
                SAFETY REPORT
              </p>

              <h2>
                Report concerning{" "}
                {
                  selectedReport
                    .reported_username
                }
              </h2>

              <p>
                {
                  categoryLabels[
                    selectedReport.category
                  ] ||
                  selectedReport.category
                }
              </p>
            </div>

            <section className="private-report-box">
              <p className="small-title">
                PRIVATE REPORT DETAILS
              </p>

              <p>
                {
                  selectedReport.details
                }
              </p>

              <div className="private-report-meta">
                <span>
                  Reporter account ID:{" "}
                  {
                    selectedReport.reporter_id
                  }
                </span>

                <span>
                  Reported account ID:{" "}
                  {
                    selectedReport.reported_user_id
                  }
                </span>
              </div>
            </section>

            <section className="admin-safety-explanation">
              <h3>
                What happens next?
              </h3>

              <p>
                Dismissing creates no
                public warning. Upholding
                creates an admin-reviewed
                yellow or red notice.
              </p>
            </section>

            <section className="moderation-level-section">
              <h3>
                Moderation Level
              </h3>

              <div className="moderation-level-options">
                <label className="yellow-level-choice">
                  <input
                    type="radio"
                    name="moderation-level"
                    value="yellow"
                    checked={
                      moderationLevel ===
                      "yellow"
                    }
                    onChange={(event) =>
                      setModerationLevel(
                        event.target.value
                      )
                    }
                  />

                  <div>
                    <strong>
                      Yellow
                    </strong>

                    <span>
                      Reviewed caution
                    </span>
                  </div>
                </label>

                <label className="red-level-choice">
                  <input
                    type="radio"
                    name="moderation-level"
                    value="red"
                    checked={
                      moderationLevel ===
                      "red"
                    }
                    onChange={(event) =>
                      setModerationLevel(
                        event.target.value
                      )
                    }
                  />

                  <div>
                    <strong>
                      Red
                    </strong>

                    <span>
                      Serious or repeated
                      reviewed concern
                    </span>
                  </div>
                </label>
              </div>
            </section>

            <section className="admin-report-fields">
              <label>
                Public safety reason

                <select
                  value={publicSummary}
                  onChange={(event) =>
                    setPublicSummary(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Choose a neutral public reason
                  </option>

                  {publicSafetyOptions.map(
                    (option) => (
                      <option
                        value={option}
                        key={option}
                      >
                        {option}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Private admin notes

                <textarea
                  rows="5"
                  maxLength="2000"
                  value={
                    privateAdminNote
                  }
                  onChange={(event) =>
                    setPrivateAdminNote(
                      event.target.value
                    )
                  }
                />
              </label>
            </section>

            <div className="report-decision-buttons">
              <button
                type="button"
                className="dismiss-report-button"
                disabled={
                  busyId ===
                  `report-${selectedReport.id}`
                }
                onClick={() =>
                  handleDismissReport(
                    selectedReport
                  )
                }
              >
                Dismiss Report
              </button>

              <button
                type="button"
                className="uphold-report-button"
                disabled={
                  busyId ===
                    `report-${selectedReport.id}` ||
                  !moderationLevel ||
                  !publicSummary
                }
                onClick={() =>
                  handleUpholdReport(
                    selectedReport
                  )
                }
              >
                Uphold Report
              </button>
            </div>
          </section>
        </div>
      )}


      {selectedAppeal && (
        <div
          className="admin-review-backdrop"
          onMouseDown={
            closeAppealReview
          }
        >
          <section
            className="admin-appeal-review-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="admin-review-close"
              type="button"
              onClick={
                closeAppealReview
              }
            >
              ├ù
            </button>

            <div className="admin-review-heading appeal-heading">
              <p className="small-title">
                MODERATION APPEAL
              </p>

              <h2>
                Appeal from{" "}
                {
                  selectedAppeal.username
                }
              </h2>

              <p>
                Original moderation
                level:{" "}
                <strong>
                  {
                    selectedAppeal
                      .moderation_level
                  }
                </strong>
              </p>
            </div>


            <section className="appeal-original-action">
              <p className="small-title">
                ORIGINAL PUBLIC SAFETY REASON
              </p>

              <p>
                {
                  selectedAppeal.public_summary
                }
              </p>

              {selectedAppeal
                .source_report_id && (
                <small>
                  Source report ID:{" "}
                  {
                    selectedAppeal
                      .source_report_id
                  }
                </small>
              )}
            </section>


            <section className="appeal-student-reason">
              <p className="small-title">
                STUDENT'S APPEAL
              </p>

              <p>
                {
                  selectedAppeal.reason
                }
              </p>
            </section>


            <section className="appeal-review-explanation">
              <h3>
                Review the appeal
              </h3>

              <p>
                Accepting the appeal
                overturns the original
                moderation action.
                Denying it leaves the
                moderation action active.
              </p>
            </section>


            <section className="admin-appeal-fields">
              <label>
                Response to student

                <textarea
                  rows="5"
                  maxLength="1000"
                  value={
                    appealResponse
                  }
                  onChange={(event) =>
                    setAppealResponse(
                      event.target.value
                    )
                  }
                  placeholder={
                    "Explain the outcome of the appeal in a clear and respectful way."
                  }
                />
              </label>

              <label>
                Private admin notes

                <textarea
                  rows="4"
                  maxLength="2000"
                  value={
                    appealPrivateNote
                  }
                  onChange={(event) =>
                    setAppealPrivateNote(
                      event.target.value
                    )
                  }
                  placeholder={
                    "Optional internal notes. The student will not see this."
                  }
                />
              </label>
            </section>


            <div className="appeal-decision-buttons">
              <button
                type="button"
                className="deny-appeal-button"
                disabled={
                  busyId ===
                    `appeal-${selectedAppeal.id}` ||
                  appealResponse.trim()
                    .length < 3
                }
                onClick={() =>
                  handleAppealDecision(
                    selectedAppeal,
                    "denied"
                  )
                }
              >
                Deny Appeal
              </button>

              <button
                type="button"
                className="accept-appeal-button"
                disabled={
                  busyId ===
                    `appeal-${selectedAppeal.id}` ||
                  appealResponse.trim()
                    .length < 3
                }
                onClick={() =>
                  handleAppealDecision(
                    selectedAppeal,
                    "accepted"
                  )
                }
              >
                {busyId ===
                `appeal-${selectedAppeal.id}`
                  ? "Working..."
                  : "Accept & Overturn"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}


export default AdminDashboard;
