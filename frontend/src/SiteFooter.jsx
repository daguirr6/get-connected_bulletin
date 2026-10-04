import {
  useCallback,
  useEffect,
  useState,
} from "react";

import FeedbackModal
  from "./FeedbackModal";

import "./SiteFooter.css";


export const OPEN_FEEDBACK_EVENT =
  "get-connected:open-feedback";


function SiteFooter() {
  const [
    feedbackOpen,
    setFeedbackOpen,
  ] = useState(
    () =>
      window.history.state
        ?.overlay === "feedback"
  );


  const openFeedback =
    useCallback(
      () => {
        if (
          window.history.state
            ?.overlay !== "feedback"
        ) {
          window.history.pushState(
            {
              ...(window.history.state || {}),
              overlay: "feedback",
            },
            "",
            window.location.href
          );
        }

        setFeedbackOpen(true);
      },
      []
    );


  const closeFeedback =
    useCallback(
      () => {
        if (
          window.history.state
            ?.overlay === "feedback"
        ) {
          window.history.back();
          return;
        }

        setFeedbackOpen(false);
      },
      []
    );


  useEffect(() => {
    function handlePopState(
      event
    ) {
      setFeedbackOpen(
        event.state?.overlay ===
          "feedback"
      );
    }

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);


  useEffect(() => {
    window.addEventListener(
      OPEN_FEEDBACK_EVENT,
      openFeedback
    );

    return () => {
      window.removeEventListener(
        OPEN_FEEDBACK_EVENT,
        openFeedback
      );
    };
  }, [openFeedback]);


  return (
    <>
      <button
        type="button"
        className="global-feedback-button"
        onClick={openFeedback}
        aria-label="Send feedback"
      >
        Feedback
      </button>


      <footer className="site-footer">
        <strong>
          Get Connected
        </strong>

        <p>
          An independent student-built
          Mason community.
        </p>

        <p>
          Not affiliated with or
          endorsed by George Mason
          University.
        </p>

        <div className="site-footer-links">
          <a href="/privacy">
            Privacy &amp; Site Information
          </a>

          <span
            aria-hidden="true"
          >
            •
          </span>

          <button
            type="button"
            onClick={openFeedback}
          >
            Feedback
          </button>
        </div>
      </footer>


      <FeedbackModal
        open={feedbackOpen}
        onClose={closeFeedback}
      />
    </>
  );
}


export default SiteFooter;
