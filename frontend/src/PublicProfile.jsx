import {
  useEffect,
  useState,
} from "react";

import {
  getPublicProfile,
} from "./api";

import SafetyModal from "./SafetyModal";

import "./PublicProfile.css";


function PublicProfile({
  token,
  userId,
  onBack,
}) {
  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    showSafety,
    setShowSafety,
  ] = useState(false);


  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const data =
          await getPublicProfile(
            token,
            userId
          );

        setProfile(data);
      } catch (loadError) {
        if (
          loadError.status === 404
        ) {
          setError(
            "This student does not have an approved About Me profile yet."
          );
        } else {
          setError(
            loadError.message
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [
    token,
    userId,
  ]);


  if (loading) {
    return (
      <main className="public-profile-page">
        <section className="profile-status-card">
          <p>
            Loading profile...
          </p>
        </section>
      </main>
    );
  }


  if (error) {
    return (
      <main className="public-profile-page">
        <section className="profile-status-card">
          <p className="small-title">
            GET CONNECTED
          </p>

          <h1>
            Profile unavailable
          </h1>

          <p>
            {error}
          </p>

          <button
            className="main-button"
            type="button"
            onClick={onBack}
          >
            Back to Connections
          </button>
        </section>
      </main>
    );
  }


  const background =
    profile.background_style ||
    "paper";

  const font =
    profile.font_style ||
    "arial";

  const initial =
    profile.display_name
      ?.trim()
      .charAt(0)
      .toUpperCase() || "?";


  return (
    <main className="public-profile-page">
      <div
        className="profile-toolbar"
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "12px",
        }}
      >
        <button
          className="profile-back-button"
          type="button"
          onClick={onBack}
        >
          ← Back to Connections
        </button>

        <button
          className="profile-back-button"
          type="button"
          onClick={() =>
            setShowSafety(true)
          }
        >
          Safety Options
        </button>
      </div>


      <section
        className={
          `public-profile-shell ` +
          `profile-theme-${background} ` +
          `profile-font-${font}`
        }
      >
        {profile.moderation &&
          profile.moderation.level !==
            "none" && (
          <div
            className={
              profile.moderation.level ===
              "red"
                ? "profile-safety profile-safety-red"
                : "profile-safety profile-safety-yellow"
            }
          >
            Safety notice
          </div>
        )}


        <header className="profile-hero">
          {profile.profile_picture_url ? (
            <img
              className="profile-avatar"
              src={
                profile.profile_picture_url
              }
              alt=""
            />
          ) : (
            <div className="profile-avatar profile-avatar-placeholder">
              {initial}
            </div>
          )}

          <div className="profile-identity">
            <p className="profile-eyebrow">
              GET CONNECTED
            </p>

            <h1>
              {profile.display_name}
            </h1>

            <p className="profile-major">
              {profile.major}
            </p>
          </div>
        </header>


        <div className="profile-columns">
          <section className="profile-section">
            <p className="profile-section-label">
              ABOUT ME
            </p>

            <h2>
              A little about me
            </h2>

            <p className="profile-body-text">
              {profile.about_me ||
                "This student hasn't added an About Me yet."}
            </p>
          </section>

          <section className="profile-section">
            <p className="profile-section-label">
              INTERESTS
            </p>

            <h2>
              Things I&apos;m into
            </h2>

            <p className="profile-body-text">
              {profile.interests ||
                "No interests added yet."}
            </p>
          </section>
        </div>


        {profile.favorite_quote && (
          <section className="profile-quote">
            <span className="quote-mark">
              “
            </span>

            <p>
              {profile.favorite_quote}
            </p>
          </section>
        )}


        <section className="profile-section profile-music-section">
          <p className="profile-section-label">
            MY SONGS
          </p>

          <h2>
            Songs on my page
          </h2>

          {profile.songs.length === 0 ? (
            <p className="profile-body-text">
              No songs added yet.
            </p>
          ) : (
            <div className="profile-song-list">
              {profile.songs.map(
                (song, index) => (
                  <article
                    className="profile-song"
                    key={song.id}
                  >
                    <span className="song-number">
                      {index + 1}
                    </span>

                    <div>
                      <strong>
                        {song.title}
                      </strong>

                      <span>
                        {song.artist}
                      </span>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>


        <footer className="profile-footer">
          <p>
            This About Me page was
            reviewed before becoming
            publicly visible.
          </p>
        </footer>
      </section>


      {showSafety && (
        <SafetyModal
          token={token}
          targetUserId={userId}
          targetName={
            profile.display_name
          }
          onClose={() =>
            setShowSafety(false)
          }
          onBlocked={() => {
            setShowSafety(false);
            onBack();
          }}
        />
      )}
    </main>
  );
}


export default PublicProfile;