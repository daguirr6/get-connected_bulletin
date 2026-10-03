import {
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import demoPostIts from "./demoPostIts";
import "./DemoBulletin.css";


const boardSlots = [
  { left: 5, top: 7 },
  { left: 24, top: 4 },
  { left: 56, top: 5 },
  { left: 76, top: 8 },

  { left: 2, top: 34 },
  { left: 80, top: 33 },

  { left: 6, top: 65 },
  { left: 25, top: 70 },
  { left: 56, top: 69 },
  { left: 75, top: 64 },
];


function shuffleArray(items) {
  const shuffled = [...items];

  for (
    let index =
      shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
        (index + 1)
      );

    [
      shuffled[index],
      shuffled[randomIndex],
    ] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}


function makePlacement(
  post,
  slot,
  index
) {
  const horizontalJitter =
    Math.floor(
      Math.random() * 5
    ) - 2;

  const verticalJitter =
    Math.floor(
      Math.random() * 5
    ) - 2;

  const rotation =
    (
      Math.random() * 4 -
      2
    ).toFixed(2);

  return {
    ...post,

    demoLeft:
      slot.left +
      horizontalJitter,

    demoTop:
      slot.top +
      verticalJitter,

    demoRotation:
      `${rotation}deg`,

    demoZ:
      2 + (index % 4),
  };
}


function DemoBulletin() {
  const [
    selectedPost,
    setSelectedPost,
  ] = useState(null);


  const randomizedPosts =
    useMemo(
      () => {
        const shuffledPosts =
          shuffleArray(
            demoPostIts
          );

        const shuffledSlots =
          shuffleArray(
            boardSlots
          );

        return shuffledPosts.map(
          (post, index) =>
            makePlacement(
              post,
              shuffledSlots[index],
              index
            )
        );
      },
      []
    );


  return (
    <>
      <div className="demo-post-stage">
        <div className="demo-board-center-message">
          <p className="demo-board-center-eyebrow">
            DEMO BULLETIN
          </p>

          <h3>
            Meet a few fictional
            students.
          </h3>

          <p>
            These sample Post-its are
            just here to show what
            Get Connected feels like
            before creating an account.
          </p>

          <p className="demo-board-center-note">
            Real student profiles appear
            after student verification.
          </p>
        </div>


        {randomizedPosts.map(
          (post) => (
            <button
              key={post.id}
              type="button"
              className={
                `demo-post-it ` +
                `demo-color-${post.color}`
              }
              style={{
                "--demo-left":
                  `${post.demoLeft}%`,

                "--demo-top":
                  `${post.demoTop}%`,

                "--demo-rotation":
                  post.demoRotation,

                "--demo-z":
                  post.demoZ,
              }}
              onClick={() =>
                setSelectedPost(
                  post
                )
              }
            >
              <span className="demo-pin" />

              <span className="demo-badge">
                DEMO
              </span>

              <span className="demo-post-name">
                {post.display_name}
              </span>

              <span className="demo-post-major">
                {post.major}
              </span>

              <span className="demo-divider" />

              <span className="demo-post-facts">
                {post.fun_facts}
              </span>

              <span className="demo-song">
                <span className="demo-music-note">
                  ♪
                </span>

                <span>
                  <strong>
                    {post.song_title}
                  </strong>

                  <small>
                    {post.song_artist}
                  </small>
                </span>
              </span>
            </button>
          )
        )}
      </div>


      {selectedPost &&
        createPortal(
          <div
            className="demo-modal-backdrop"
            onClick={() =>
              setSelectedPost(null)
            }
          >
            <section
              className="demo-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                className="demo-modal-close"
                onClick={() =>
                  setSelectedPost(null)
                }
              >
                ×
              </button>

              <p className="demo-modal-eyebrow">
                FICTIONAL SAMPLE PROFILE
              </p>

              <h3>
                {
                  selectedPost
                    .display_name
                }
              </h3>

              <p className="demo-modal-major">
                {selectedPost.major}
              </p>

              <p className="demo-modal-facts">
                {selectedPost.fun_facts}
              </p>

              <div className="demo-modal-song">
                <span>
                  ♪
                </span>

                <div>
                  <strong>
                    {
                      selectedPost
                        .song_title
                    }
                  </strong>

                  <small>
                    {
                      selectedPost
                        .song_artist
                    }
                  </small>
                </div>
              </div>

              <p className="demo-modal-note">
                This is a fictional demo
                profile. Real student
                profiles and connection
                features are available
                after student verification.
              </p>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}


export default DemoBulletin;