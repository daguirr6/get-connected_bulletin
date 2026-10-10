import {
  useEffect,
  useState,
} from "react";

import {
  getPublicProfile,
} from "./api";

import SafetyModal from "./SafetyModal";

import "./PublicProfile.css";


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


function splitLookingFor(
  value
) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map(
      (item) => item.trim()
    )
    .filter(Boolean);
}


function splitInterests(
  value
) {
  if (!value) {
    return [];
  }

  const seen = new Set();

  return value
    .split(/[,;\n]+/)
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean)
    .filter((item) => {
      const normalized =
        item.toLocaleLowerCase();

      if (
        seen.has(normalized)
      ) {
        return false;
      }

      seen.add(
        normalized
      );

      return true;
    });
}


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
    let cancelled = false;


    async function loadProfile() {
      try {
        const data =
          await getPublicProfile(
            token,
            userId
          );

        if (cancelled) {
          return;
        }

        setProfile(data);
        setError("");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

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
        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    loadProfile();


    return () => {
      cancelled = true;
    };
  }, [
    token,
    userId,
  ]);


  if (loading) {
    return (
      <main className="public-profile-page">
        <section className="public-profile-status">
          <p className="small-title">
            GET CONNECTED
          </p>

          <h1>
            Loading profile...
          </h1>
        </section>
      </main>
    );
  }


  if (error) {
    return (
      <main className="public-profile-page">
        <section className="public-profile-status">
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
            type="button"
            onClick={onBack}
          >
            Back to Connections
          </button>
        </section>
      </main>
    );
  }


  const theme =
    profile.background_style ||
    "paper";

  const font =
    profile.font_style ||
    "arial";

  const initial =
    profile.display_name
      .trim()
      .charAt(0)
      .toUpperCase();

  const year =
    yearLabels[
      profile.class_year
    ] || null;

  const lookingFor =
    splitLookingFor(
      profile.looking_for
    );

  const interests =
    splitInterests(
      profile.interests
    );

  const identityItems =
    profile.identity_items || [];


  return (
    <main
      className={
        `public-profile-page ` +
        `public-theme-${theme} ` +
        `public-font-${font}`
      }
    >
      <nav className="retro-profile-nav">
        <div className="retro-brand">
          Get Connected
        </div>

        <div className="retro-nav-links">
          <button
            type="button"
            onClick={onBack}
          >
            Connections
          </button>

          <span>|</span>

          <button
            type="button"
            onClick={() =>
              setShowSafety(true)
            }
          >
            Safety Options
          </button>
        </div>
      </nav>


      <section className="retro-profile-shell">
        <aside className="retro-left-column">
          <h1 className="retro-profile-name">
            {profile.display_name}
          </h1>


          {profile.profile_picture_url ? (
            <img
              className="retro-profile-photo"
              src={
                profile.profile_picture_url
              }
              alt={
                `${profile.display_name}'s profile`
              }
            />
          ) : (
            <div className="retro-profile-photo retro-photo-placeholder">
              {initial}
            </div>
          )}


          <section className="retro-box green-box">
            <h2>
              Connection Card
            </h2>

            <div className="retro-box-body connection-id-card">
              <div>
                <strong>
                  Name
                </strong>

                <span>
                  {profile.display_name}
                </span>
              </div>

              <div>
                <strong>
                  Major
                </strong>

                <span>
                  {profile.major}
                </span>
              </div>

              {year && (
                <div>
                  <strong>
                    Year
                  </strong>

                  <span>
                    {year}
                  </span>
                </div>
              )}

              <div>
                <strong>
                  Where I&apos;m headed
                </strong>

                <span>
                  {profile.aspiration ||
                    "Going with the flow"}
                </span>
              </div>
            </div>
          </section>


          <section className="retro-box identity-box">
            <h2>
              {profile.display_name} isn&apos;t{" "}
              {profile.display_name} without...
            </h2>

            <div className="retro-box-body">
              {identityItems.length > 0 ? (
                <div className="identity-public-tags">
                  {identityItems.map(
                    (item) => (
                      <span
                        key={item}
                        className="identity-public-tag"
                      >
                        {item}
                      </span>
                    )
                  )}
                </div>
              ) : (
                <p className="retro-empty">
                  Nothing added yet.
                </p>
              )}
            </div>
          </section>


          <section className="retro-box green-box">
            <h2>
              {profile.display_name}&apos;s
              Interests
            </h2>

            <div className="retro-box-body">
              {interests.length > 0 ? (
                <div className="looking-tags">
                  {interests.map(
                    (interest) => (
                      <span
                        key={interest}
                        className="looking-tag"
                      >
                        {interest}
                      </span>
                    )
                  )}
                </div>
              ) : (
                <p className="retro-empty">
                  Nothing added yet.
                </p>
              )}
            </div>
          </section>


          <section className="retro-box green-box">
            <h2>
              My Music
            </h2>

            <div className="retro-box-body">
              {profile.songs.length ===
              0 ? (
                <p className="retro-empty">
                  No songs added yet.
                </p>
              ) : (
                <div className="retro-song-list">
                  {profile.songs.map(
                    (song, index) => (
                      <div
                        className="retro-song"
                        key={song.id}
                      >
                        <span className="retro-song-number">
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
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        </aside>


        <section className="retro-right-column">
          <section className="extended-network">
            <h2>
              {profile.display_name} is
              in your Get Connected
              network!
            </h2>
          </section>


          {profile.moderation &&
            profile.moderation.level !==
              "none" && (
            <section
              className={
                profile.moderation.level ===
                "red"
                  ? "public-safety-box public-safety-red"
                  : "public-safety-box public-safety-yellow"
              }
            >
              <strong>
                Safety notice
              </strong>

              {profile.moderation.notices
                ?.length > 0 && (
                <ul>
                  {profile.moderation.notices.map(
                    (notice) => (
                      <li key={notice}>
                        {notice}
                      </li>
                    )
                  )}
                </ul>
              )}
            </section>
          )}


          <section className="retro-box gold-box">
            <h2>
              Looking to Connect For
            </h2>

            <div className="retro-box-body">
              {lookingFor.length > 0 ? (
                <div className="looking-tags">
                  {lookingFor.map(
                    (item) => (
                      <span
                        key={item}
                        className="looking-tag"
                      >
                        {item}
                      </span>
                    )
                  )}
                </div>
              ) : (
                <p className="retro-empty">
                  Nothing selected yet.
                </p>
              )}
            </div>
          </section>


          <section className="retro-box gold-box">
            <h2>
              Ask Me About
            </h2>

            <div className="retro-box-body">
              {profile.ask_me_about ? (
                <p className="retro-text">
                  {profile.ask_me_about}
                </p>
              ) : (
                <p className="retro-empty">
                  No topics added yet.
                </p>
              )}
            </div>
          </section>


          <section className="retro-box blurb-box">
            <h2>
              {profile.display_name}&apos;s
              Blurbs
            </h2>

            <div className="retro-box-body">
              <section className="public-blurb">
                <h3>
                  About me:
                </h3>

                <p>
                  {profile.about_me ||
                    "This student hasn't written an About Me yet."}
                </p>
              </section>


              {profile.current_obsession && (
                <section className="public-blurb">
                  <h3>
                    Current obsession:
                  </h3>

                  <p>
                    {
                      profile.current_obsession
                    }
                  </p>
                </section>
              )}


              {profile.favorite_quote && (
                <section className="public-blurb">
                  <h3>
                    Favorite quote:
                  </h3>

                  <blockquote>
                    “
                    {
                      profile.favorite_quote
                    }
                    ”
                  </blockquote>
                </section>
              )}
            </div>
          </section>


          <section className="retro-profile-footer">
            <p>
              This profile was reviewed
              before becoming publicly
              visible.
            </p>
          </section>
        </section>
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