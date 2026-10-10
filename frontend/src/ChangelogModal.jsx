import {
  useEffect,
  useState,
} from "react";

import "./Changelog.css";


function formatPublishedDate(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}


function ChangelogModal({
  entries,
  loading,
  error,
  onClose,
}) {
  const [
    selectedEntry,
    setSelectedEntry,
  ] = useState(null);


  useEffect(() => {
    function handleKeyDown(
      event
    ) {
      if (
        event.key === "Escape"
      ) {
        onClose();
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
  }, [onClose]);


  return (
    <div
      className="changelog-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="changelog-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          "changelog-title"
        }
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <header className="changelog-header">
          <div>
            <p className="changelog-eyebrow">
              GET CONNECTED
            </p>

            <h2
              id="changelog-title"
            >
              What&apos;s New
            </h2>

            <p>
              A quick look at recent
              improvements.
            </p>
          </div>

          <button
            type="button"
            className="changelog-close"
            aria-label={
              "Close What's New"
            }
            onClick={onClose}
          >
            ×
          </button>
        </header>


        <div className="changelog-layout">
          <aside className="changelog-list-panel">
            {loading ? (
              <div className="changelog-list-message">
                Loading updates...
              </div>
            ) : error ? (
              <div className="changelog-list-error">
                {error}
              </div>
            ) : entries.length ===
              0 ? (
              <div className="changelog-list-message">
                No updates yet.
              </div>
            ) : (
              <div className="changelog-entry-list">
                {entries.map(
                  (entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      className={
                        selectedEntry
                          ?.id ===
                        entry.id
                          ? "changelog-entry selected"
                          : "changelog-entry"
                      }
                      onClick={() =>
                        setSelectedEntry(
                          entry
                        )
                      }
                    >
                      <div className="changelog-entry-topline">
                        <span className="changelog-entry-category">
                          {
                            entry.category
                          }
                        </span>

                        {entry.is_unread && (
                          <span className="changelog-new-dot">
                            NEW
                          </span>
                        )}
                      </div>

                      <strong>
                        {entry.title}
                      </strong>

                      <span className="changelog-entry-date">
                        {formatPublishedDate(
                          entry.published_at
                        )}
                      </span>
                    </button>
                  )
                )}
              </div>
            )}
          </aside>


          <section className="changelog-detail-panel">
            {selectedEntry ? (
              <article
                key={
                  selectedEntry.id
                }
                className="changelog-detail-content"
              >
                <p className="changelog-detail-category">
                  {
                    selectedEntry.category
                  }
                </p>

                <h3>
                  {
                    selectedEntry.title
                  }
                </h3>

                <p className="changelog-detail-date">
                  {formatPublishedDate(
                    selectedEntry
                      .published_at
                  )}
                </p>

                <div className="changelog-detail-divider">
                </div>

                <p className="changelog-detail-summary">
                  {
                    selectedEntry.summary
                  }
                </p>
              </article>
            ) : (
              <div className="changelog-detail-empty">
                <div className="changelog-empty-mark">
                  GC
                </div>

                <h3>
                  Select an update
                </h3>

                <p>
                  Choose something from
                  the left to see what
                  changed.
                </p>
              </div>
            )}
          </section>
        </div>


        <footer className="changelog-footer">
          <p>
            Updates are kept short and
            focus on what changed for
            students.
          </p>

          <button
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}


export default ChangelogModal;