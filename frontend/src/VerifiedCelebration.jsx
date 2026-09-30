import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./VerifiedCelebration.css";


const confettiColors = [
  "#006633",
  "#f2c230",
  "#ff8fb1",
  "#8fd3ff",
  "#c49cff",
  "#ffb66e",
  "#9be28f",
];


function VerifiedCelebration({
  username,
  onContinue,
}) {
  const audioContextRef =
    useRef(null);

  const [soundPlayed, setSoundPlayed] =
    useState(false);

  const [soundBlocked, setSoundBlocked] =
    useState(false);


  const confettiPieces =
    useMemo(
      () =>
        Array.from(
          { length: 90 },
          (_, index) => ({
            id: index,

            left:
              `${(index * 37) % 100}%`,

            delay:
              `${(index % 18) * 0.06}s`,

            duration:
              `${
                3.2 +
                (index % 8) * 0.22
              }s`,

            drift:
              `${
                ((index * 29) % 160) -
                80
              }px`,

            spin:
              `${
                360 +
                (index % 6) * 120
              }deg`,

            width:
              `${7 + (index % 4) * 2}px`,

            height:
              `${11 + (index % 5) * 3}px`,

            color:
              confettiColors[
                index %
                  confettiColors.length
              ],
          })
        ),
      []
    );


  const playCelebrationSound =
    useCallback(
      async () => {
        try {
          const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

          if (!AudioContextClass) {
            setSoundBlocked(true);

            return;
          }

          if (
            audioContextRef.current &&
            audioContextRef.current.state !==
              "closed"
          ) {
            await audioContextRef.current.close();
          }

          const audioContext =
            new AudioContextClass();

          audioContextRef.current =
            audioContext;

          if (
            audioContext.state ===
            "suspended"
          ) {
            await audioContext.resume();
          }

          if (
            audioContext.state !==
            "running"
          ) {
            setSoundBlocked(true);

            return;
          }

          const start =
            audioContext.currentTime +
            0.03;


          const notes = [
            {
              frequency: 523.25,
              offset: 0,
              duration: 0.28,
            },
            {
              frequency: 659.25,
              offset: 0.12,
              duration: 0.3,
            },
            {
              frequency: 783.99,
              offset: 0.24,
              duration: 0.34,
            },
            {
              frequency: 1046.5,
              offset: 0.42,
              duration: 0.55,
            },
          ];


          notes.forEach(
            ({
              frequency,
              offset,
              duration,
            }) => {
              const oscillator =
                audioContext
                  .createOscillator();

              const gain =
                audioContext
                  .createGain();

              oscillator.type =
                "sine";

              oscillator.frequency
                .setValueAtTime(
                  frequency,
                  start + offset
                );

              gain.gain
                .setValueAtTime(
                  0.0001,
                  start + offset
                );

              gain.gain
                .exponentialRampToValueAtTime(
                  0.16,
                  start +
                    offset +
                    0.025
                );

              gain.gain
                .exponentialRampToValueAtTime(
                  0.0001,
                  start +
                    offset +
                    duration
                );

              oscillator.connect(
                gain
              );

              gain.connect(
                audioContext.destination
              );

              oscillator.start(
                start + offset
              );

              oscillator.stop(
                start +
                  offset +
                  duration
              );
            }
          );


          setSoundPlayed(true);
          setSoundBlocked(false);

        } catch {
          setSoundBlocked(true);
        }
      },
      []
    );


  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          playCelebrationSound();
        },
        150
      );


    return () => {
      window.clearTimeout(
        timer
      );

      if (
        audioContextRef.current &&
        audioContextRef.current.state !==
          "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, [playCelebrationSound]);


  return (
    <main className="verified-celebration-page">
      <div
        className="verified-confetti-layer"
        aria-hidden="true"
      >
        {confettiPieces.map(
          (piece) => (
            <span
              key={piece.id}
              className="verified-confetti-piece"
              style={{
                "--confetti-left":
                  piece.left,

                "--confetti-delay":
                  piece.delay,

                "--confetti-duration":
                  piece.duration,

                "--confetti-drift":
                  piece.drift,

                "--confetti-spin":
                  piece.spin,

                "--confetti-width":
                  piece.width,

                "--confetti-height":
                  piece.height,

                "--confetti-color":
                  piece.color,
              }}
            />
          )
        )}
      </div>


      <section className="verified-celebration-card">
        <p className="verified-small-title">
          YOU&apos;RE VERIFIED!
        </p>

        <h1>
          Welcome to Get Connected!
        </h1>

        <p className="verified-name">
          Hey {username}!
        </p>

        <p className="verified-text">
          Your student verification
          has been approved.
        </p>

        <p className="verified-text">
          You can now create your
          Post-it, customize your
          profile, discover students
          with shared interests, and
          start making connections.
        </p>


        <button
          className="verified-sound-button"
          type="button"
          onClick={
            playCelebrationSound
          }
        >
          {soundBlocked
            ? "🔊 Play Celebration Sound"
            : soundPlayed
              ? "🔊 Replay Celebration Sound"
              : "🔊 Play Celebration Sound"}
        </button>


        <button
          className="verified-continue-button"
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