import {
  useState,
} from "react";

import "./RegisterFlow.css";


function RegisterFlow({
  username,
  setUsername,
  password,
  setPassword,
  fullName,
  setFullName,
  major,
  setMajor,
  loading,
  onRegister,
  onGoToLogin,
  onReturnHome,
}) {
  const [step, setStep] =
    useState(1);

  const [
    registrationComplete,
    setRegistrationComplete,
  ] = useState(false);


  function continueToVerification(
    event
  ) {
    event.preventDefault();

    if (
      !username.trim() ||
      !password
    ) {
      return;
    }

    setStep(2);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  async function submitRegistration(
    event
  ) {
    const success =
      await onRegister(event);

    if (!success) {
      return;
    }

    setRegistrationComplete(
      true
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  if (registrationComplete) {
    return (
      <section className="register-success">
        <div className="register-success-icon">
          ✓
        </div>

        <p className="register-eyebrow">
          ACCOUNT CREATED
        </p>

        <h2>
          You&apos;re on the board —
          almost!
        </h2>

        <p>
          Your Get Connected account
          was created successfully.
        </p>

        <div className="register-success-card">
          <strong>
            What happens now?
          </strong>

          <p>
            A student administrator
            manually checks the legal
            name and major you submitted
            to confirm that you&apos;re a
            Mason student.
          </p>

          <p>
            When an administrator is
            active, verification may
            only take a few minutes.
            Depending on the time of day,
            class schedules, work, or
            availability, it may take
            longer.
          </p>
        </div>

        <div className="register-no-notification">
          <strong>
            One important thing:
          </strong>

          <p>
            Get Connected deliberately
            does not collect your email
            address or phone number.
            Because of that, we cannot
            send you an email or text
            when your account is
            approved.
          </p>

          <p>
            <strong>
              Come back and log in soon
              to check your verification
              status!
            </strong>
          </p>
        </div>

        <div className="register-site-reminder">
          <span>
            Bookmark us:
          </span>

          <strong>
            getconnectedmason.com
          </strong>
        </div>

        <button
          className="register-primary-button"
          type="button"
          onClick={onGoToLogin}
        >
          Log In & Check My Status
        </button>

        <button
          className="register-secondary-button"
          type="button"
          onClick={onReturnHome}
        >
          Return Home
        </button>
      </section>
    );
  }


  if (step === 1) {
    return (
      <form
        className="register-flow"
        onSubmit={
          continueToVerification
        }
      >
        <div className="register-step-heading">
          <div className="register-progress-label">
            <span>
              CREATE YOUR ACCOUNT
            </span>

            <strong>
              Step 1 of 2
            </strong>
          </div>

          <div className="register-progress-track">
            <div className="register-progress-half" />
          </div>

          <h2>
            Start with your
            Get Connected account.
          </h2>

          <p>
            This login belongs only to
            Get Connected and is
            completely separate from
            your Mason account.
          </p>
        </div>


        <label className="register-label">
          Create a Get Connected username

          <input
            type="text"
            value={username}
            onChange={(event) =>
              setUsername(
                event.target.value
              )
            }
            autoComplete="username"
            required
          />

          <small>
            This does not need to be
            your Mason NetID.
          </small>
        </label>


        <label className="register-label">
          Create a Get Connected password

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            autoComplete="new-password"
            required
          />

          <small>
            Make a password specifically
            for Get Connected.
          </small>
        </label>


        <div className="register-security-box">
          <strong>
            🔒 Independent login
          </strong>

          <p>
            Never enter your Mason
            password, Duo code, or other
            university login credentials
            here.
          </p>
        </div>


        <button
          className="register-primary-button"
          type="submit"
        >
          Continue to Student Verification →
        </button>
      </form>
    );
  }


  return (
    <form
      className="register-flow"
      onSubmit={
        submitRegistration
      }
    >
      <div className="register-step-heading">
        <div className="register-progress-label">
          <span>
            STUDENT VERIFICATION
          </span>

          <strong>
            Step 2 of 2
          </strong>
        </div>

        <div className="register-progress-track">
          <div className="register-progress-full" />
        </div>

        <h2>
          Just prove you&apos;re
          one of us.
        </h2>

        <p>
          Get Connected is intended for
          Mason students, so every new
          account is manually verified
          before it can access real
          student profiles and
          connections.
        </p>
      </div>


      <div className="register-why-box">
        <p className="register-why-title">
          Why do we ask for this?
        </p>

        <p>
          A student administrator uses
          your legal name and major to
          manually confirm that you&apos;re
          a Mason student.
        </p>

        <p>
          Your legal name stays private.
          Your major may later appear to
          other verified Get Connected
          students on your Post-it and
          profile.
        </p>
      </div>


      <label className="register-label">
        Full legal name

        <input
          type="text"
          value={fullName}
          onChange={(event) =>
            setFullName(
              event.target.value
            )
          }
          autoComplete="name"
          required
        />

        <small>
          Used for manual student
          verification. Not displayed
          publicly.
        </small>
      </label>


      <label className="register-label">
        Major

        <input
          type="text"
          value={major}
          onChange={(event) =>
            setMajor(
              event.target.value
            )
          }
          required
        />

        <small>
          Used during verification and
          later shown only within the
          verified student community.
        </small>
      </label>


      <div className="register-not-needed">
        <strong>
          We do NOT need:
        </strong>

        <div className="register-not-needed-grid">
          <span>
            ✓ GMU email
          </span>

          <span>
            ✓ Personal email
          </span>

          <span>
            ✓ Phone number
          </span>

          <span>
            ✓ Mason password
          </span>

          <span>
            ✓ Duo code
          </span>

          <span>
            ✓ University credentials
          </span>
        </div>
      </div>


      <div className="register-final-actions">
        <button
          className="register-back-button"
          type="button"
          disabled={loading}
          onClick={() =>
            setStep(1)
          }
        >
          ← Back
        </button>

        <button
          className="register-primary-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Creating Account..."
            : "Create My Account"}
        </button>
      </div>
    </form>
  );
}


export default RegisterFlow;