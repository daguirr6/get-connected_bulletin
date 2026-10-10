import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getInterestCatalog,
  getMyInterests,
  updateMyInterests,
} from "./interestApi";

import "./InterestPicker.css";


const MAX_INTERESTS = 25;


function normalizeName(
  value
) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}


function InterestPicker({
  token,
  onLegacyTextChange,
}) {
  const [catalog, setCatalog] =
    useState([]);

  const [
    selectedInterests,
    setSelectedInterests,
  ] = useState([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    showBrowser,
    setShowBrowser,
  ] = useState(false);


  function updateLegacyText(
    interests
  ) {
    if (!onLegacyTextChange) {
      return;
    }

    onLegacyTextChange(
      interests
        .map(
          (interest) =>
            interest.name
        )
        .join(", ")
    );
  }


  useEffect(() => {
    let cancelled = false;


    async function loadInitialInterests() {
      try {
        const [
          catalogData,
          selectedData,
        ] = await Promise.all([
          getInterestCatalog(token),
          getMyInterests(token),
        ]);

        if (cancelled) {
          return;
        }

        const selected =
          selectedData
            .selected_interests ||
          [];

        setCatalog(
          catalogData
        );

        setSelectedInterests(
          selected
        );

        setError("");

        if (onLegacyTextChange) {
          onLegacyTextChange(
            selected
              .map(
                (interest) =>
                  interest.name
              )
              .join(", ")
          );
        }
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


    loadInitialInterests();


    return () => {
      cancelled = true;
    };
  }, [
    token,
    onLegacyTextChange,
  ]);


  useEffect(() => {
    if (!showBrowser) {
      return undefined;
    }


    function handleKeyDown(
      event
    ) {
      if (
        event.key === "Escape"
      ) {
        setShowBrowser(false);
        setSearch("");
      }
    }


    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [showBrowser]);


  const selectedIds =
    useMemo(
      () =>
        new Set(
          selectedInterests.map(
            (interest) =>
              interest.id
          )
        ),
      [selectedInterests]
    );


  const cleanedSearch =
    search
      .trim()
      .replace(/\s+/g, " ");


  const normalizedSearch =
    normalizeName(search);


  const searchResults =
    useMemo(() => {
      if (!normalizedSearch) {
        return [];
      }

      return catalog
        .filter(
          (interest) =>
            !selectedIds.has(
              interest.id
            )
        )
        .filter((interest) => {
          const name =
            normalizeName(
              interest.name
            );

          const category =
            normalizeName(
              interest.category
            );

          return (
            name.includes(
              normalizedSearch
            ) ||
            category.includes(
              normalizedSearch
            )
          );
        })
        .slice(0, 20);
    }, [
      catalog,
      normalizedSearch,
      selectedIds,
    ]);


  const exactCatalogMatch =
    useMemo(
      () =>
        catalog.find(
          (interest) =>
            normalizeName(
              interest.name
            ) ===
            normalizedSearch
        ) || null,
      [
        catalog,
        normalizedSearch,
      ]
    );


  const selectedNameMatch =
    useMemo(
      () =>
        selectedInterests.some(
          (interest) =>
            normalizeName(
              interest.name
            ) ===
            normalizedSearch
        ),
      [
        selectedInterests,
        normalizedSearch,
      ]
    );


  const availableCatalog =
    useMemo(
      () =>
        catalog.filter(
          (interest) =>
            !selectedIds.has(
              interest.id
            )
        ),
      [
        catalog,
        selectedIds,
      ]
    );


  const groupedCatalog =
    useMemo(() => {
      const groups = {};

      for (
        const interest
        of availableCatalog
      ) {
        if (
          !groups[
            interest.category
          ]
        ) {
          groups[
            interest.category
          ] = [];
        }

        groups[
          interest.category
        ].push(
          interest
        );
      }

      return Object.entries(
        groups
      ).sort(
        ([
          categoryA,
        ], [
          categoryB,
        ]) =>
          categoryA.localeCompare(
            categoryB
          )
      );
    }, [availableCatalog]);


  const atLimit =
    selectedInterests.length >=
    MAX_INTERESTS;


  const canCreateNew =
    cleanedSearch.length >= 2 &&
    cleanedSearch.length <= 50 &&
    !exactCatalogMatch &&
    !selectedNameMatch &&
    !atLimit;


  async function saveSelection(
    interestIds,
    newInterests = []
  ) {
    setSaving(true);
    setError("");

    try {
      const result =
        await updateMyInterests(
          token,
          interestIds,
          newInterests
        );

      const selected =
        result
          .selected_interests ||
        [];

      setSelectedInterests(
        selected
      );

      updateLegacyText(
        selected
      );

      if (
        newInterests.length > 0
      ) {
        const refreshedCatalog =
          await getInterestCatalog(
            token
          );

        setCatalog(
          refreshedCatalog
        );
      }

      return true;
    } catch (saveError) {
      setError(
        saveError.message
      );

      return false;
    } finally {
      setSaving(false);
    }
  }


  async function addExistingInterest(
    interest
  ) {
    if (
      saving ||
      atLimit ||
      selectedIds.has(
        interest.id
      )
    ) {
      return;
    }

    const nextIds = [
      ...selectedInterests.map(
        (selected) =>
          selected.id
      ),
      interest.id,
    ];

    const saved =
      await saveSelection(
        nextIds
      );

    if (saved) {
      setSearch("");
    }
  }


  async function removeInterest(
    interestId
  ) {
    if (saving) {
      return;
    }

    const nextIds =
      selectedInterests
        .filter(
          (interest) =>
            interest.id !==
            interestId
        )
        .map(
          (interest) =>
            interest.id
        );

    await saveSelection(
      nextIds
    );
  }


  async function addNewInterest() {
    if (
      saving ||
      !canCreateNew
    ) {
      return;
    }

    const currentIds =
      selectedInterests.map(
        (interest) =>
          interest.id
      );

    const saved =
      await saveSelection(
        currentIds,
        [
          cleanedSearch,
        ]
      );

    if (saved) {
      setSearch("");
    }
  }


  function handleSearchKeyDown(
    event
  ) {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();

    if (
      exactCatalogMatch &&
      !selectedIds.has(
        exactCatalogMatch.id
      )
    ) {
      addExistingInterest(
        exactCatalogMatch
      );

      return;
    }

    if (canCreateNew) {
      addNewInterest();
    }
  }


  function closeBrowser() {
    if (saving) {
      return;
    }

    setShowBrowser(false);
    setSearch("");
    setError("");
  }


  if (loading) {
    return (
      <div className="interest-picker-loading">
        Loading interests...
      </div>
    );
  }


  return (
    <div className="interest-picker">
      <div className="interest-picker-heading">
        <div>
          <strong>
            Your Interests
          </strong>

          <p>
            Choose up to 25 things
            you&apos;re genuinely into.
            These are used to help
            find people you may click
            with.
          </p>
        </div>

        <span
          className={
            atLimit
              ? "interest-count interest-count-full"
              : "interest-count"
          }
        >
          {
            selectedInterests.length
          }
          {" / "}
          {MAX_INTERESTS}
        </span>
      </div>


      {selectedInterests.length >
      0 ? (
        <div className="selected-interest-list">
          {selectedInterests.map(
            (interest) => (
              <button
                type="button"
                className="selected-interest-chip"
                key={interest.id}
                disabled={saving}
                title={
                  `Remove ${interest.name}`
                }
                onClick={() =>
                  removeInterest(
                    interest.id
                  )
                }
              >
                <span>
                  {interest.name}
                </span>

                <span
                  className="interest-chip-remove"
                  aria-hidden="true"
                >
                  ×
                </span>
              </button>
            )
          )}
        </div>
      ) : (
        <p className="interest-picker-empty">
          You haven&apos;t selected
          any interests yet.
        </p>
      )}


      {error && !showBrowser && (
        <div className="interest-picker-error">
          {error}
        </div>
      )}


      {saving && !showBrowser && (
        <div className="interest-picker-saving">
          Saving interests...
        </div>
      )}


      <button
        type="button"
        className="open-interest-browser"
        onClick={() => {
          setError("");
          setShowBrowser(true);
        }}
      >
        + Add Interests...
      </button>


      <p className="interest-picker-note">
        Can&apos;t find something?
        Add it yourself. New interests
        are saved to the community
        catalog so other students can
        select them later too.
      </p>


      {showBrowser && (
        <div
          className="interest-modal-backdrop"
          role="presentation"
          onMouseDown={
            closeBrowser
          }
        >
          <section
            className="interest-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              "interest-modal-title"
            }
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <header className="interest-modal-header">
              <div>
                <p className="interest-modal-eyebrow">
                  GET CONNECTED
                </p>

                <h2
                  id="interest-modal-title"
                >
                  Add Interests
                </h2>

                <p>
                  Find something already
                  in the community
                  catalog or add your
                  own.
                </p>
              </div>

              <button
                type="button"
                className="interest-modal-close"
                aria-label={
                  "Close interest browser"
                }
                disabled={saving}
                onClick={
                  closeBrowser
                }
              >
                ×
              </button>
            </header>


            <div className="interest-modal-summary">
              <strong>
                {
                  selectedInterests.length
                }
                {" / "}
                {MAX_INTERESTS}
              </strong>

              <span>
                interests selected
              </span>
            </div>


            <div className="interest-search-area">
              <label
                htmlFor="interest-search"
              >
                Search interests
              </label>

              <input
                id="interest-search"
                type="text"
                maxLength="50"
                autoComplete="off"
                autoFocus
                value={search}
                disabled={saving}
                placeholder={
                  atLimit
                    ? "Remove an interest to add another"
                    : "Try Destiny 2, architecture, hiking..."
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleSearchKeyDown
                }
              />

              <p className="interest-search-help">
                If there&apos;s no exact
                match, you can create a
                new interest. New ones
                are permanently saved
                for the community and
                placed into one of the
                broad interest
                categories.
              </p>
            </div>


            {error && (
              <div className="interest-picker-error">
                {error}
              </div>
            )}


            {saving && (
              <div className="interest-picker-saving">
                Saving interests...
              </div>
            )}


            <div className="interest-modal-content">
              {normalizedSearch ? (
                <div className="interest-search-results">
                  {searchResults.length >
                  0 && (
                    <>
                      <p className="interest-result-label">
                        Matches
                      </p>

                      <div className="interest-result-list">
                        {searchResults.map(
                          (
                            interest
                          ) => (
                            <button
                              type="button"
                              key={
                                interest.id
                              }
                              className="interest-result-button"
                              disabled={
                                saving ||
                                atLimit
                              }
                              onClick={() =>
                                addExistingInterest(
                                  interest
                                )
                              }
                            >
                              <span>
                                {
                                  interest.name
                                }
                              </span>

                              <small>
                                {
                                  interest.category
                                }
                              </small>
                            </button>
                          )
                        )}
                      </div>
                    </>
                  )}


                  {exactCatalogMatch &&
                    selectedIds.has(
                      exactCatalogMatch.id
                    ) && (
                    <p className="interest-already-selected">
                      {
                        exactCatalogMatch.name
                      }{" "}
                      is already selected.
                    </p>
                  )}


                  {canCreateNew && (
                    <div className="new-interest-card">
                      <p>
                        No exact match
                        for:
                      </p>

                      <strong>
                        {cleanedSearch}
                      </strong>

                      <button
                        type="button"
                        className="create-interest-button"
                        disabled={
                          saving
                        }
                        onClick={
                          addNewInterest
                        }
                      >
                        + Add &quot;
                        {cleanedSearch}
                        &quot;
                      </button>

                      <small>
                        This becomes a
                        reusable community
                        interest for future
                        students too.
                      </small>
                    </div>
                  )}


                  {!exactCatalogMatch &&
                    !canCreateNew &&
                    !selectedNameMatch &&
                    cleanedSearch.length >
                      0 &&
                    cleanedSearch.length <
                      2 && (
                    <p className="interest-search-message">
                      Type at least
                      2 characters.
                    </p>
                  )}


                  {atLimit && (
                    <p className="interest-limit-message">
                      You&apos;ve reached
                      the 25-interest
                      limit. Remove one
                      before adding
                      another.
                    </p>
                  )}


                  {searchResults.length ===
                    0 &&
                    !canCreateNew &&
                    !selectedNameMatch &&
                    !atLimit &&
                    cleanedSearch.length >=
                      2 && (
                    <p className="interest-search-message">
                      No matches found.
                    </p>
                  )}
                </div>
              ) : (
                <div className="interest-browser">
                  <div className="interest-browser-heading">
                    <div>
                      <strong>
                        Browse Interests
                      </strong>

                      <p>
                        Pick anything
                        that sounds like
                        you.
                      </p>
                    </div>

                    <span>
                      {catalog.length} in
                      the community
                      catalog
                    </span>
                  </div>


                  {groupedCatalog.map(
                    ([
                      category,
                      interests,
                    ]) => (
                      <section
                        className="interest-category"
                        key={category}
                      >
                        <h4>
                          {category}
                        </h4>

                        <div className="interest-category-chips">
                          {interests.map(
                            (
                              interest
                            ) => (
                              <button
                                type="button"
                                key={
                                  interest.id
                                }
                                className="available-interest-chip"
                                disabled={
                                  saving ||
                                  atLimit
                                }
                                onClick={() =>
                                  addExistingInterest(
                                    interest
                                  )
                                }
                              >
                                +{" "}
                                {
                                  interest.name
                                }
                              </button>
                            )
                          )}
                        </div>
                      </section>
                    )
                  )}


                  {availableCatalog.length ===
                    0 &&
                    selectedInterests.length >
                      0 && (
                    <p className="interest-picker-empty">
                      You&apos;ve selected
                      every currently
                      available interest.
                    </p>
                  )}
                </div>
              )}
            </div>


            <footer className="interest-modal-footer">
              <p>
                New custom interests
                stay saved for future
                students.
              </p>

              <button
                type="button"
                disabled={saving}
                onClick={
                  closeBrowser
                }
              >
                Done
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}


export default InterestPicker;