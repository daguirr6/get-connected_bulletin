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


const MAX_INTERESTS = 12;


function normalizeName(value) {
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
        .slice(0, 12);
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
            Choose up to 12 things
            you&apos;re genuinely into.
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


      <div className="interest-search-area">
        <label
          htmlFor="interest-search"
        >
          Search or add an interest
        </label>

        <input
          id="interest-search"
          type="text"
          maxLength="50"
          autoComplete="off"
          value={search}
          disabled={saving}
          placeholder={
            atLimit
              ? "Remove an interest to add another"
              : "Try gaming, cooking, paragliding..."
          }
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          onKeyDown={
            handleSearchKeyDown
          }
        />

        <p className="interest-search-help">
          Search the community
          catalog first. If your
          interest isn&apos;t there,
          you can add it for everyone.
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


      {normalizedSearch && (
        <div className="interest-search-results">
          {searchResults.length >
          0 && (
            <>
              <p className="interest-result-label">
                Matches
              </p>

              <div className="interest-result-list">
                {searchResults.map(
                  (interest) => (
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
            <button
              type="button"
              className="create-interest-button"
              disabled={saving}
              onClick={
                addNewInterest
              }
            >
              + Add &quot;
              {cleanedSearch}
              &quot;
            </button>
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
              the 12-interest limit.
              Remove one before
              adding another.
            </p>
          )}
        </div>
      )}


      {!normalizedSearch && (
        <div className="interest-browser">
          <div className="interest-browser-heading">
            <strong>
              Browse Interests
            </strong>

            <span>
              {catalog.length} in
              the community catalog
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
                    (interest) => (
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
              every currently available
              interest.
            </p>
          )}
        </div>
      )}
    </div>
  );
}


export default InterestPicker;