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
  ] = useState(false);


  const openFeedback =
    useCallback(
      () => {
        setFeedbackOpen(
          true
        );
      },
      []
    );


  const closeFeedback =
    useCallback(
      () => {
        setFeedbackOpen(
          false
        );
      },
      []
    );


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
  }, [
    openFeedback,
  ]);


  return (
    <>
      <button
        type="button"
        className="global-feedback-button"
        onClick={
          openFeedback
        }
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
            onClick={
              openFeedback
            }
          >
            Feedback
          </button>
        </div>
      </footer>


      <FeedbackModal
        open={
          feedbackOpen
        }
        onClose={
          closeFeedback
        }
      />
    </>
  );
}


export default SiteFooter;