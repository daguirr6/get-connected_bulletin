import {
  useEffect,
  useRef,
  useState,
} from "react";


function VerifiedCelebration({
  username,
  onContinue,
}) {
  const audioRef = useRef(null);

  const [showConfetti, setShowConfetti] =
    useState(true);

  const [soundBlocked, setSoundBlocked] =
    useState(false);


  useEffect(() => {
    const audio = new Audio(
      "/media/verified-cheer.mp3"
    );

    audio.volume = 0.7;
    audio.preload = "auto";

    audioRef.current = audio;

    audio.play().catch(() => {
      setSoundBlocked(true);
    });

    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 3500);

    return () => {
      clearTimeout(confettiTimer);

      audio.pause();
      audio.currentTime = 0;
    };
  }, []);


  function playCelebrationSound() {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.currentTime = 0;

    audioRef.current
      .play()
      .then(() => {
        setSoundBlocked(false);
      })
      .catch(() => {
        setSoundBlocked(true);
      });
  }


  return (
    <main className="celebration-page">
      {showConfetti && (
        <img
          className="verification-confetti"
          src="/media/verified-confetti.gif"
          alt=""
        />
      )}

      <section className="celebration-card">
        <p className="small-title">
          GET CONNECTED
        </p>

        <h1>You&apos;re verified!</h1>

        <p className="celebration-message">
          Welcome, {username}!
        </p>

        <p className="celebration-text">
          Your student account has officially
          been verified.
        </p>

        <p className="celebration-text">
          You can now create your Post-it,
          meet other students, and start
          making connections around campus!
        </p>

        {soundBlocked && (
          <button
            className="sound-button"
            type="button"
            onClick={playCelebrationSound}
          >
            Play celebration sound
          </button>
        )}

        <button
          className="main-button"
          type="button"
          onClick={onContinue}
        >
          Enter the Bulletin
        </button>
      </section>
    </main>
  );
}


export default VerifiedCelebration;