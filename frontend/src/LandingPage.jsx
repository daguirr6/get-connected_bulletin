import {
  useEffect,
  useState,
} from "react";

import DemoBulletin
  from "./DemoBulletin";

import {
  OPEN_FEEDBACK_EVENT,
} from "./SiteFooter";

import "./LandingPage.css";
import "./LandingPageExtras.css";


const loadingMessages = [ 
  "Brandishing a few last files...", 
  "Someone put the floppy disk in backwards...", 
  "Trying to solo Malenia as a Wretch...", 
  "Convincing PostgreSQL we're friends...", 
  "Attempting to out-pizza the hut...", 
  "Currently waiting in line at panera...", 
  "All these squares make a circle...", 
  "Im tired of this, Grandpa...",
  "Counting Post-its one by one...", 
  "Pretending this loading bar is necessary...", 
  "Bazinga...", 
  "Driver picks the music, shotgun shuts his cakehole...", 
  "Reality is an illusion, the universe is a hologram, buy gold, bye...",   
]; 


const INTRO_DURATION =
  13000;

const MESSAGE_DURATION =
  2600;

const FINISH_HOLD =
  850;


function LandingPage({
  onLogin,
  onCreateAccount,
  onPrivacy,
}) {
  const alreadySeen =
    sessionStorage.getItem(
      "get_connected_v2_intro_seen"
    ) === "true";


  const [
    introDone,
    setIntroDone,
  ] = useState(
    alreadySeen
  );


  const [
    introFinishing,
    setIntroFinishing,
  ] = useState(false);


  const [
    progress,
    setProgress,
  ] = useState(
    alreadySeen ? 100 : 0
  );


  const [
    messageIndex,
    setMessageIndex,
  ] = useState(
    Math.floor(
      Math.random() *
      loadingMessages.length
    )
  );


  useEffect(() => {
    const previousScrollRestoration =
      window.history
        .scrollRestoration;

    window.history
      .scrollRestoration =
      "manual";

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    return () => {
      window.history
        .scrollRestoration =
        previousScrollRestoration;
    };
  }, []);


  useEffect(() => {
    if (alreadySeen) {
      return;
    }


    const startTime =
      Date.now();


    const progressTimer =
      window.setInterval(
        () => {
          const elapsed =
            Date.now() -
            startTime;

          const percentage =
            Math.min(
              100,
              Math.floor(
                (
                  elapsed /
                  INTRO_DURATION
                ) *
                100
              )
            );

          setProgress(
            percentage
          );


          if (
            percentage >= 100
          ) {
            window.clearInterval(
              progressTimer
            );
          }
        },
        100
      );


    const messageTimer =
      window.setInterval(
        () => {
          setMessageIndex(
            (current) => {
              let next =
                Math.floor(
                  Math.random() *
                  loadingMessages.length
                );

              while (
                next === current
              ) {
                next =
                  Math.floor(
                    Math.random() *
                    loadingMessages.length
                  );
              }

              return next;
            }
          );
        },
        MESSAGE_DURATION
      );


    const finishingTimer =
      window.setTimeout(
        () => {
          setProgress(100);

          setIntroFinishing(
            true
          );
        },
        INTRO_DURATION
      );


    const finishTimer =
      window.setTimeout(
        () => {
          setIntroDone(true);

          sessionStorage.setItem(
            "get_connected_v2_intro_seen",
            "true"
          );
        },
        INTRO_DURATION +
          FINISH_HOLD
      );


    return () => {
      window.clearInterval(
        progressTimer
      );

      window.clearInterval(
        messageTimer
      );

      window.clearTimeout(
        finishingTimer
      );

      window.clearTimeout(
        finishTimer
      );
    };
  }, [alreadySeen]);


  function skipIntro() {
    setProgress(100);

    setIntroFinishing(
      true
    );

    window.setTimeout(
      () => {
        setIntroDone(true);

        sessionStorage.setItem(
          "get_connected_v2_intro_seen",
          "true"
        );
      },
      400
    );
  }


  function scrollToSection(
    sectionId
  ) {
    document
      .getElementById(
        sectionId
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }


  function openFeedback() {
    window.dispatchEvent(
      new Event(
        OPEN_FEEDBACK_EVENT
      )
    );
  }


  return (
    <main
      className={[
        "v2-home",

        introDone
          ? "v2-ready"
          : "v2-loading",

        introFinishing
          ? "v2-finishing"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <section className="v2-opening">
        <div className="v2-brand">
          <h1>
            Get Connected
          </h1>

          <p>
            A STUDENT-BUILT
            MASON COMMUNITY
          </p>
        </div>


        {!introDone && (
          <div className="v2-loader-area">
            <p
              className="v2-loader-message"
              key={messageIndex}
            >
              {
                loadingMessages[
                  messageIndex
                ]
              }
            </p>

            <div className="v2-loader-track">
              <div
                className="v2-loader-fill"
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <span className="v2-loader-percent">
              {progress}%
            </span>

            <button
              type="button"
              className="v2-skip-button"
              onClick={skipIntro}
            >
              Skip intro →
            </button>
          </div>
        )}


        {introDone && (
          <nav
            className="v2-main-nav"
            aria-label="Main navigation"
          >
            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "demo-bulletin"
                )
              }
            >
              Bulletin
            </button>

            <button
              type="button"
              onClick={onLogin}
            >
              Connections
            </button>

            <button
              type="button"
              onClick={onLogin}
            >
              My Profile
            </button>

            <button
              type="button"
              onClick={onPrivacy}
            >
              Safety &amp; Appeals
            </button>

            <button
              type="button"
              onClick={
                onCreateAccount
              }
            >
              Create Post-it
            </button>

            <button
              type="button"
              onClick={
                openFeedback
              }
            >
              Feedback
            </button>

            <button
              type="button"
              className="v2-login-nav"
              onClick={onLogin}
            >
              Log In
            </button>
          </nav>
        )}
      </section>


      {introDone && (
        <div className="v2-page-content">
          <section
            className="v2-demo-section"
            id="demo-bulletin"
          >
            <div className="v2-section-heading">
              <p className="v2-eyebrow">
                PREVIEW THE BULLETIN
              </p>

              <h2>
                See what Get Connected
                feels like.
              </h2>

              <p>
                The public preview uses
                fictional sample students
                so you can explore the idea
                before creating an account.
              </p>
            </div>


            <div className="v2-demo-board">
              <DemoBulletin />
            </div>
          </section>


          <section
            className="v2-about"
            id="about"
          >
            <div className="v2-about-copy">
              <p className="v2-eyebrow">
                WHY GET CONNECTED?
              </p>

              <h2>
                Thousands of students
                cross paths every day.
              </h2>

              <p>
                Some of them share your
                major, hobbies, interests,
                favorite games, favorite
                music, or the exact same
                weird obsession — and you
                might never know it.
              </p>

              <p>
                Get Connected is a
                student-built digital
                bulletin board designed
                to make those introductions
                a little easier.
              </p>
            </div>


            <div className="v2-how-grid">
              <article>
                <span>
                  01
                </span>

                <h3>
                  Pin Yourself Up
                </h3>

                <p>
                  Make a Post-it and
                  introduce yourself.
                </p>
              </article>

              <article>
                <span>
                  02
                </span>

                <h3>
                  Make It Yours
                </h3>

                <p>
                  Build a profile and
                  share only what you
                  want others to know.
                </p>
              </article>

              <article>
                <span>
                  03
                </span>

                <h3>
                  Find Your People
                </h3>

                <p>
                  Discover students
                  through shared
                  interests.
                </p>
              </article>

              <article>
                <span>
                  04
                </span>

                <h3>
                  Get Connected
                </h3>

                <p>
                  Connect, chat, and
                  see where things go.
                </p>
              </article>
            </div>
          </section>


          <section className="v2-bottom-cta">
            <p className="v2-eyebrow">
              READY TO JOIN THE BOARD?
            </p>

            <h2>
              Put yourself out there.
            </h2>

            <p>
              Creating an account does
              not require your Mason
              password, Duo code,
              university email, or phone
              number.
            </p>

            <div className="v2-cta-buttons">
              <button
                type="button"
                className="v2-primary-button"
                onClick={
                  onCreateAccount
                }
              >
                Create an Account
              </button>

              <button
                type="button"
                className="v2-secondary-button"
                onClick={onLogin}
              >
                Log In
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}


export default LandingPage;