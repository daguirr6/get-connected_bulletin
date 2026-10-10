import {
  useEffect,
  useState,
} from "react";

import {
  getChangelog,
  markChangelogSeen,
} from "./changelogApi";

import ChangelogModal
  from "./ChangelogModal";

import "./Changelog.css";


function ChangelogLauncher({
  token,
}) {
  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    entries,
    setEntries,
  ] = useState([]);

  const [
    showChangelog,
    setShowChangelog,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;


    getChangelog(
      token
    )
      .then((data) => {
        if (cancelled) {
          return;
        }

        setUnreadCount(
          data.unread_count ||
          0
        );
      })
      .catch(() => {
        // The changelog should
        // never interrupt the site.
      });


    return () => {
      cancelled = true;
    };
  }, [token]);


  async function openChangelog() {
    if (!token) {
      return;
    }

    setShowChangelog(
      true
    );

    setLoading(true);
    setError("");

    try {
      const data =
        await getChangelog(
          token
        );

      const loadedEntries =
        data.entries || [];

      setEntries(
        loadedEntries
      );

      setUnreadCount(
        data.unread_count ||
        0
      );

      if (
        (
          data.unread_count ||
          0
        ) > 0
      ) {
        try {
          await markChangelogSeen(
            token
          );

          setUnreadCount(0);
        } catch {
          // Keep the modal usable
          // even if marking as read
          // fails temporarily.
        }
      }
    } catch (loadError) {
      setError(
        loadError.message
      );
    } finally {
      setLoading(false);
    }
  }


  function closeChangelog() {
    setShowChangelog(
      false
    );
  }


  if (!token) {
    return null;
  }


  const unreadLabel =
    unreadCount > 99
      ? "99+"
      : unreadCount;


  return (
    <>
      <button
        type="button"
        className="changelog-launcher-button"
        onClick={
          openChangelog
        }
      >
        <span>
          What&apos;s New
        </span>

        {unreadCount > 0 && (
          <span className="changelog-launcher-badge">
            {unreadLabel}
            {" NEW"}
          </span>
        )}
      </button>


      {showChangelog && (
        <ChangelogModal
          entries={entries}
          loading={loading}
          error={error}
          onClose={
            closeChangelog
          }
        />
      )}
    </>
  );
}


export default ChangelogLauncher;