import "./PrivacyPage.css";


function PrivacyPage({ onBack }) {
  return (
    <main className="privacy-page">
      <section className="privacy-card">
        <div className="privacy-heading">
          <p className="small-title">
            GET CONNECTED
          </p>

          <h1>
            Privacy & Site Information
          </h1>

          <p>
            Get Connected is an unofficial,
            student-built project created for
            George Mason University students.
            It is not affiliated with or
            endorsed by George Mason University.
          </p>
        </div>

        <section className="privacy-section">
          <h2>
            What Get Connected collects
          </h2>

          <p>
            The site stores the information
            needed to create and operate your
            account. This can include your
            username, password hash, verification
            information, Post-it, profile,
            connections, chat messages, reports,
            blocks, appeals, and moderation
            records.
          </p>

          <p>
            Passwords are not stored as readable
            plain text. The server stores a
            password hash used to verify login
            attempts.
          </p>
        </section>

        <section className="privacy-grid">
          <article>
            <p className="small-title">
              VISIBLE TO VERIFIED STUDENTS
            </p>

            <h3>
              Community information
            </h3>

            <ul>
              <li>Display name</li>
              <li>Verified major</li>
              <li>Post-it information</li>
              <li>Approved profile information</li>
              <li>Shared interests used for suggestions</li>
              <li>Reviewed public safety notices, when applicable</li>
            </ul>
          </article>

          <article>
            <p className="small-title">
              PRIVATE / ADMIN REVIEW
            </p>

            <h3>
              Verification and safety information
            </h3>

            <ul>
              <li>Full legal name submitted for verification</li>
              <li>Private block reasons</li>
              <li>Report explanations</li>
              <li>Private moderation notes</li>
              <li>Appeal information</li>
            </ul>
          </article>

          <article>
            <p className="small-title">
              BETWEEN CONNECTED USERS
            </p>

            <h3>
              Chat messages
            </h3>

            <p>
              Chat messages are shown through the
              app to the connected students in that
              conversation. The application does not
              provide a general student-facing way to
              browse somebody else&apos;s chats.
            </p>
          </article>

          <article>
            <p className="small-title">
              SERVICE OPERATION
            </p>

            <h3>
              Technical information
            </h3>

            <p>
              The server and security providers may
              process technical request information,
              such as network addresses and request
              timing, to operate and protect the site.
            </p>
          </article>
        </section>

        <section className="privacy-section">
          <h2>
            Verification
          </h2>

          <p>
            Your full legal name is collected so an
            administrator can compare your submitted
            information with publicly available GMU
            student information. Your legal name is
            not used as your public display name.
          </p>
        </section>

        <section className="privacy-section">
          <h2>
            Profiles and moderation
          </h2>

          <p>
            Profile content is reviewed before it is
            made publicly visible to other verified
            students. Raw report text, private block
            reasons, and reporter identities are not
            published as public warnings. Public
            safety notices are based on reviewed
            moderation decisions.
          </p>
        </section>

        <section className="privacy-section">
          <h2>
            Backups and retention
          </h2>

          <p>
            Get Connected creates recurring backups
            of its database and uploaded profile
            images. Automatic backup copies are
            currently retained for approximately
            fourteen days. Some information may remain
            in a backup until that backup expires.
          </p>
        </section>

        <section className="privacy-section">
          <h2>
            Account and data removal
          </h2>

          <p>
            You may request that your Get Connected
            account be removed. Moderation and safety
            records may be retained when reasonably
            necessary to protect the community,
            investigate abuse, or maintain an audit
            trail. Other account content should be
            removed or made unavailable as part of
            the removal process.
          </p>

          <p>
            For account, privacy, or data-removal
            questions, contact:
          </p>

          <a
            className="privacy-contact"
            href="mailto:support@getconnectedmason.com"
          >
            support@getconnectedmason.com
          </a>
        </section>

        <section className="privacy-section privacy-safety-section">
          <h2>
            Safety
          </h2>

          <p>
            Only share information you are
            comfortable giving to other verified
            students. Do not post sensitive personal
            information such as passwords, financial
            information, private addresses, or other
            information that does not need to be
            public.
          </p>

          <p>
            Blocking is immediate. Reports are sent
            to the administrator for review. A block
            count by itself does not automatically
            create a public warning or remove an
            account.
          </p>
        </section>

        <section className="privacy-section">
          <h2>
            No sale of student data
          </h2>

          <p>
            Get Connected is a student-built project,
            not an advertising business. Student
            account information is not intended to be
            sold to advertisers.
          </p>
        </section>

        <div className="privacy-disclaimer">
          <strong>
            Unofficial project notice
          </strong>

          <p>
            Get Connected is independently built and
            operated as a student project. George
            Mason University does not operate,
            sponsor, or endorse this website.
          </p>
        </div>

        <button
          className="privacy-back-button"
          type="button"
          onClick={onBack}
        >
          Back to Get Connected
        </button>
      </section>
    </main>
  );
}


export default PrivacyPage;
