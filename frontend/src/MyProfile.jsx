import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  addProfileSong,
  deleteProfilePicture,
  deleteProfileSong,
  getMyPostIt,
  getMyProfile,
  submitMyProfile,
  updateMyProfile,
  uploadProfilePicture,
} from "./api";

import InterestPicker from "./InterestPicker";

import "./MyProfile.css";


const connectOptions = [
  "New friends",
  "Study buddies",
  "Gaming",
  "Campus events",
  "Clubs",
  "Networking",
  "Gym partners",
  "Creative projects",
];


const yearOptions = [
  {
    value: "",
    label: "Choose your year",
  },
  {
    value: "freshman",
    label: "Freshman",
  },
  {
    value: "sophomore",
    label: "Sophomore",
  },
  {
    value: "junior",
    label: "Junior",
  },
  {
    value: "senior",
    label: "Senior",
  },
  {
    value: "graduate",
    label: "Graduate",
  },
  {
    value: "other",
    label: "Other",
  },
  {
    value: "prefer_not_to_say",
    label: "Prefer not to say",
  },
];


const themeOptions = [
  {
    value: "paper",
    label: "Classic Paper",
  },
  {
    value: "stars",
    label: "Stars",
  },
  {
    value: "grid",
    label: "Notebook Grid",
  },
  {
    value: "retro",
    label: "Retro",
  },
  {
    value: "clouds",
    label: "Clouds",
  },
  {
    value: "minimal",
    label: "Minimal",
  },
];


const fontOptions = [
  {
    value: "arial",
    label: "Arial",
  },
  {
    value: "georgia",
    label: "Georgia",
  },
  {
    value: "courier",
    label: "Courier",
  },
  {
    value: "verdana",
    label: "Verdana",
  },
  {
    value: "pixel",
    label: "Pixel-ish",
  },
];


function splitLookingFor(value) {
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


function prettyYear(value) {
  const match =
    yearOptions.find(
      (item) =>
        item.value === value
    );

  return match?.label || "";
}


function MyProfile({
  token,
  currentUser,
  onBackToBulletin,
  onLogout,
}) {
  const [profile, setProfile] =
    useState(null);

  const [myPostIt, setMyPostIt] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [addingSong, setAddingSong] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [aboutMe, setAboutMe] =
    useState("");

  const [
    favoriteQuote,
    setFavoriteQuote,
  ] = useState("");

  const [classYear, setClassYear] =
    useState("");

  const [aspiration, setAspiration] =
    useState("");

  const [
    lookingFor,
    setLookingFor,
  ] = useState([]);

  const [
    askMeAbout,
    setAskMeAbout,
  ] = useState("");

  const [
    currentObsession,
    setCurrentObsession,
  ] = useState("");

  const [
    backgroundStyle,
    setBackgroundStyle,
  ] = useState("paper");

  const [fontStyle, setFontStyle] =
    useState("arial");

  const [songTitle, setSongTitle] =
    useState("");

  const [songArtist, setSongArtist] =
    useState("");


  const applyProfile =
    useCallback(
      (data) => {
        setProfile(data);

        if (!data) {
          setAboutMe("");
          setFavoriteQuote("");
          setClassYear("");
          setAspiration("");
          setLookingFor([]);
          setAskMeAbout("");
          setCurrentObsession("");
          setBackgroundStyle(
            "paper"
          );
          setFontStyle("arial");

          return;
        }

        setAboutMe(
          data.about_me || ""
        );

        setFavoriteQuote(
          data.favorite_quote || ""
        );

        setClassYear(
          data.class_year || ""
        );

        setAspiration(
          data.aspiration || ""
        );

        setLookingFor(
          splitLookingFor(
            data.looking_for
          )
        );

        setAskMeAbout(
          data.ask_me_about || ""
        );

        setCurrentObsession(
          data.current_obsession || ""
        );

        setBackgroundStyle(
          data.background_style ||
            "paper"
        );

        setFontStyle(
          data.font_style ||
            "arial"
        );
      },
      []
    );


  const loadProfile =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const [
            profileData,
            postData,
          ] = await Promise.all([
            getMyProfile(token),
            getMyPostIt(token),
          ]);

          applyProfile(
            profileData
          );

          setMyPostIt(
            postData
          );
        } catch (loadError) {
          setError(
            loadError.message
          );
        } finally {
          setLoading(false);
        }
      },
      [
        token,
        applyProfile,
      ]
    );


  useEffect(() => {
    let cancelled = false;


    async function loadInitialProfile() {
      try {
        const [
          profileData,
          postData,
        ] = await Promise.all([
          getMyProfile(token),
          getMyPostIt(token),
        ]);

        if (cancelled) {
          return;
        }

        applyProfile(
          profileData
        );

        setMyPostIt(
          postData
        );

        setError("");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError.message
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    loadInitialProfile();


    return () => {
      cancelled = true;
    };
  }, [
    token,
    applyProfile,
  ]);


  function buildProfileData() {
    return {
      about_me:
        aboutMe.trim() || null,

      favorite_quote:
        favoriteQuote.trim() ||
        null,

      class_year:
        classYear || null,

      aspiration:
        aspiration.trim() || null,

      looking_for:
        lookingFor.length > 0
          ? lookingFor.join(" | ")
          : null,

      ask_me_about:
        askMeAbout.trim() || null,

      current_obsession:
        currentObsession.trim() ||
        null,

      background_style:
        backgroundStyle,

      font_style:
        fontStyle,
    };
  }


  async function saveDraft(
    showMessage = true
  ) {
    setSaving(true);
    setError("");

    try {
      const saved =
        await updateMyProfile(
          token,
          buildProfileData()
        );

      applyProfile(saved);

      if (showMessage) {
        setMessage(
          "Your profile draft was saved!"
        );
      }

      return saved;
    } catch (saveError) {
      setError(
        saveError.message
      );

      return null;
    } finally {
      setSaving(false);
    }
  }


  async function handleSave(
    event
  ) {
    event.preventDefault();

    setMessage("");

    await saveDraft(true);
  }


  async function handleSubmitForReview() {
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const saved =
        await saveDraft(false);

      if (!saved) {
        return;
      }

      const result =
        await submitMyProfile(
          token
        );

      setMessage(
        result.message
      );

      await loadProfile();
    } catch (submitError) {
      setError(
        submitError.message
      );
    } finally {
      setSubmitting(false);
    }
  }


  function toggleLookingFor(
    option
  ) {
    setLookingFor(
      (current) => {
        if (
          current.includes(option)
        ) {
          return current.filter(
            (item) =>
              item !== option
          );
        }

        return [
          ...current,
          option,
        ];
      }
    );
  }


  async function ensureProfile() {
    if (profile) {
      return profile;
    }

    return saveDraft(false);
  }


  async function handlePictureUpload(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const readyProfile =
        await ensureProfile();

      if (!readyProfile) {
        return;
      }

      const updated =
        await uploadProfilePicture(
          token,
          file
        );

      applyProfile(updated);

      setMessage(
        "Your profile picture was updated!"
      );
    } catch (uploadError) {
      setError(
        uploadError.message
      );
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  }


  async function handleDeletePicture() {
    setUploading(true);
    setMessage("");
    setError("");

    try {
      await deleteProfilePicture(
        token
      );

      await loadProfile();

      setMessage(
        "Your profile picture was removed."
      );
    } catch (deleteError) {
      setError(
        deleteError.message
      );
    } finally {
      setUploading(false);
    }
  }


  async function handleAddSong(
    event
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (
      !songTitle.trim() ||
      !songArtist.trim()
    ) {
      return;
    }

    setAddingSong(true);
    setMessage("");
    setError("");

    try {
      const readyProfile =
        await ensureProfile();

      if (!readyProfile) {
        return;
      }

      await addProfileSong(
        token,
        songTitle.trim(),
        songArtist.trim()
      );

      await loadProfile();
      setSongTitle("");
      setSongArtist("");

      setMessage(
        "Song added to your profile!"
      );
    } catch (songError) {
      setError(
        songError.message
      );
    } finally {
      setAddingSong(false);
    }
  }


  async function handleDeleteSong(
    songId
  ) {
    setMessage("");
    setError("");

    try {
      await deleteProfileSong(
        token,
        songId
      );

      await loadProfile();

      setMessage(
        "Song removed."
      );
    } catch (songError) {
      setError(
        songError.message
      );
    }
  }


  const displayName =
    myPostIt?.display_name ||
    currentUser.username;

  const major =
    myPostIt?.major ||
    "Major not available yet";

  const profileStatus =
    profile?.status ||
    "not started";


  if (loading) {
    return (
      <main className="my-profile-page">
        <section className="profile-loading-card">
          <p className="small-title">
            GET CONNECTED
          </p>

          <h1>
            Loading your profile...
          </h1>
        </section>
      </main>
    );
  }


  return (
    <main className="my-profile-page">
      <header className="my-profile-topbar">
        <div>
          <p className="small-title">
            GET CONNECTED
          </p>

          <h1>
            My Profile
          </h1>

          <p>
            Make this little corner of
            Get Connected feel like you.
          </p>
        </div>

        <div className="my-profile-nav">
          <button
            type="button"
            onClick={
              onBackToBulletin
            }
          >
            Back to Bulletin
          </button>

          <button
            type="button"
            className="profile-logout"
            onClick={onLogout}
          >
            Log Out
          </button>
        </div>
      </header>


      <div className="profile-editor-status">
        <span>
          Profile status:
        </span>

        <strong
          className={
            `editor-status ` +
            `status-${profileStatus}`
          }
        >
          {profileStatus.replace(
            "_",
            " "
          )}
        </strong>

        {profile?.admin_note && (
          <p>
            Admin note:{" "}
            {profile.admin_note}
          </p>
        )}
      </div>


      {message && (
        <div className="profile-editor-message">
          {message}
        </div>
      )}

      {error && (
        <div className="profile-editor-error">
          {error}
        </div>
      )}


      <form
        className={
          `myspace-editor ` +
          `editor-font-${fontStyle}`
        }
        onSubmit={handleSave}
      >
        <aside className="profile-left-column">
          <section className="oldweb-name">
            <h2>
              {displayName}
            </h2>
          </section>


          <section className="profile-photo-panel">
            {profile?.profile_picture_url ? (
              <img
                src={
                  profile.profile_picture_url
                }
                alt=""
                className="editor-profile-picture"
              />
            ) : (
              <div className="editor-picture-placeholder">
                {displayName
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <label className="picture-upload-button">
              {uploading
                ? "Working..."
                : profile?.profile_picture_url
                  ? "Change Picture"
                  : "Upload Picture"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handlePictureUpload
                }
                disabled={
                  uploading
                }
              />
            </label>

            {profile?.profile_picture_url && (
              <button
                className="picture-remove-button"
                type="button"
                onClick={
                  handleDeletePicture
                }
                disabled={
                  uploading
                }
              >
                Remove Picture
              </button>
            )}

            <p className="picture-help">
              JPEG, PNG, or WebP.
              Maximum 5 MB.
            </p>
          </section>


          <section className="oldweb-box">
            <h3>
              Connection Card
            </h3>

            <div className="connection-card-body">
              <p>
                <strong>Name</strong>

                <span>
                  {displayName}
                </span>
              </p>

              <p>
                <strong>Major</strong>

                <span>
                  {major}
                </span>
              </p>

              <label>
                <strong>
                  Year
                </strong>

                <select
                  value={classYear}
                  onChange={(event) =>
                    setClassYear(
                      event.target.value
                    )
                  }
                >
                  {yearOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <strong>
                  Where I&apos;m headed
                </strong>

                <input
                  type="text"
                  maxLength="255"
                  list="aspiration-ideas"
                  value={aspiration}
                  onChange={(event) =>
                    setAspiration(
                      event.target.value
                    )
                  }
                  placeholder={
                    "Software engineer, teacher, still figuring it out..."
                  }
                />

                <datalist id="aspiration-ideas">
                  <option value="Still figuring it out" />
                  <option value="Going with the flow" />
                  <option value="Exploring my options" />
                  <option value="Ask me again after finals" />
                </datalist>
              </label>
            </div>
          </section>


          <section className="oldweb-box">
            <h3>
              {displayName}&apos;s Interests
            </h3>

            <InterestPicker
              token={token}
            />
          </section>


          <section className="oldweb-box">
            <h3>
              My Music
            </h3>

            <div className="editor-song-list">
              {profile?.songs?.length > 0 ? (
                profile.songs.map(
                  (song) => (
                    <div
                      className="editor-song"
                      key={song.id}
                    >
                      <div>
                        <strong>
                          ♪ {song.title}
                        </strong>

                        <span>
                          {song.artist}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteSong(
                            song.id
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  )
                )
              ) : (
                <p className="oldweb-empty">
                  No songs yet.
                </p>
              )}
            </div>

            <div className="add-song-form">
              <input
                type="text"
                maxLength="150"
                value={songTitle}
                onChange={(event) =>
                  setSongTitle(
                    event.target.value
                  )
                }
                placeholder="Song title"
              />

              <input
                type="text"
                maxLength="150"
                value={songArtist}
                onChange={(event) =>
                  setSongArtist(
                    event.target.value
                  )
                }
                placeholder="Artist"
              />

              <button
                type="button"
                onClick={handleAddSong}
                disabled={
                  addingSong ||
                  !songTitle.trim() ||
                  !songArtist.trim()
                }
              >
                {addingSong
                  ? "Adding..."
                  : "+ Add Song"}
              </button>
            </div>

            <p className="song-help">
              Up to 10 songs.
              These are displayed as
              profile information only.
            </p>
          </section>
        </aside>


        <section className="profile-right-column">
          <section className="extended-network-box">
            <h2>
              This is your little corner
              of Get Connected
            </h2>

            <p>
              Make it personal. Give
              somebody something easy
              to start a conversation
              about.
            </p>
          </section>


          <section className="oldweb-wide-box">
            <h3>
              Looking to Connect For
            </h3>

            <p className="section-help">
              What kinds of connections
              are you hoping to make?
            </p>

            <div className="connect-checkbox-grid">
              {connectOptions.map(
                (option) => (
                  <label
                    className="connect-checkbox"
                    key={option}
                  >
                    <input
                      type="checkbox"
                      checked={
                        lookingFor.includes(
                          option
                        )
                      }
                      onChange={() =>
                        toggleLookingFor(
                          option
                        )
                      }
                    />

                    <span>
                      {option}
                    </span>
                  </label>
                )
              )}
            </div>
          </section>


          <section className="oldweb-wide-box">
            <h3>
              Ask Me About
            </h3>

            <textarea
              rows="4"
              maxLength="2000"
              value={askMeAbout}
              onChange={(event) =>
                setAskMeAbout(
                  event.target.value
                )
              }
              placeholder={
                "Birdwatching, Destiny, cooking, coding, anime..."
              }
            />
          </section>


          <section className="oldweb-wide-box blurb-box">
            <h3>
              {displayName}&apos;s Blurbs
            </h3>

            <div className="blurb-section">
              <label>
                About me:
              </label>

              <textarea
                rows="9"
                maxLength="5000"
                value={aboutMe}
                onChange={(event) =>
                  setAboutMe(
                    event.target.value
                  )
                }
                placeholder={
                  "Whatever you want people to know about you can go here."
                }
              />
            </div>

            <div className="blurb-section">
              <label>
                Current obsession:
              </label>

              <textarea
                rows="3"
                maxLength="500"
                value={
                  currentObsession
                }
                onChange={(event) =>
                  setCurrentObsession(
                    event.target.value
                  )
                }
                placeholder={
                  "A game, hobby, show, project, song, random rabbit hole..."
                }
              />
            </div>

            <div className="blurb-section">
              <label>
                Favorite quote:
              </label>

              <textarea
                rows="3"
                maxLength="500"
                value={
                  favoriteQuote
                }
                onChange={(event) =>
                  setFavoriteQuote(
                    event.target.value
                  )
                }
                placeholder={
                  "Something funny, meaningful, or completely ridiculous."
                }
              />
            </div>
          </section>


          <section className="oldweb-wide-box">
            <h3>
              Profile Appearance
            </h3>

            <div className="appearance-grid">
              <label>
                Theme

                <select
                  value={
                    backgroundStyle
                  }
                  onChange={(event) =>
                    setBackgroundStyle(
                      event.target.value
                    )
                  }
                >
                  {themeOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Font

                <select
                  value={fontStyle}
                  onChange={(event) =>
                    setFontStyle(
                      event.target.value
                    )
                  }
                >
                  {fontOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <p className="appearance-note">
              Themes will keep the
              Get Connected green, gold,
              and cream identity while
              changing the background
              personality of your page.
            </p>
          </section>


          <section className="profile-preview-card">
            <p className="small-title">
              CONNECTION CARD PREVIEW
            </p>

            <h2>
              {displayName}
            </h2>

            <p>
              {major}
            </p>

            {classYear && (
              <p>
                {prettyYear(
                  classYear
                )}
              </p>
            )}

            {aspiration && (
              <>
                <strong>
                  Where I&apos;m headed:
                </strong>

                <p>
                  {aspiration}
                </p>
              </>
            )}
          </section>


          <div className="profile-save-area">
            <button
              className="save-draft-button"
              type="submit"
              disabled={
                saving ||
                submitting
              }
            >
              {saving
                ? "Saving..."
                : "Save Draft"}
            </button>

            <button
              className="submit-profile-button"
              type="button"
              disabled={
                saving ||
                submitting
              }
              onClick={
                handleSubmitForReview
              }
            >
              {submitting
                ? "Submitting..."
                : "Submit for Review"}
            </button>
          </div>

          <p className="review-reminder">
            Your public profile won&apos;t
            appear to other students until
            it has been reviewed and
            approved.
          </p>
        </section>
      </form>
    </main>
  );
}


export default MyProfile;