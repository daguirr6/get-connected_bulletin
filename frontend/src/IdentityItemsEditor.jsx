import {
  useState,
} from "react";

import "./IdentityItemsEditor.css";


const MAX_ITEMS = 10;
const MAX_ITEM_LENGTH = 60;


function normalizeItem(
  value
) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}


function IdentityItemsEditor({
  displayName,
  items,
  onChange,
}) {
  const [input, setInput] =
    useState("");

  const [error, setError] =
    useState("");


  const atLimit =
    items.length >= MAX_ITEMS;


  function addItem() {
    const cleaned =
      input
        .trim()
        .replace(/\s+/g, " ");

    if (!cleaned) {
      return;
    }

    if (
      cleaned.length >
      MAX_ITEM_LENGTH
    ) {
      setError(
        `Keep each item under ${MAX_ITEM_LENGTH} characters.`
      );

      return;
    }

    const normalized =
      normalizeItem(cleaned);

    const duplicate =
      items.some(
        (item) =>
          normalizeItem(item) ===
          normalized
      );

    if (duplicate) {
      setError(
        "You already added that one."
      );

      return;
    }

    if (atLimit) {
      setError(
        "You can add up to 10 things."
      );

      return;
    }

    onChange([
      ...items,
      cleaned,
    ]);

    setInput("");
    setError("");
  }


  function removeItem(
    index
  ) {
    onChange(
      items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );

    setError("");
  }


  function handleKeyDown(
    event
  ) {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();

    addItem();
  }


  return (
    <div className="identity-editor">
      <div className="identity-editor-heading">
        <div>
          <strong>
            {displayName} isn&apos;t{" "}
            {displayName} without...
          </strong>

          <p>
            Pick up to 10 things that
            make you feel like you.
            These don&apos;t affect
            connection matching.
          </p>
        </div>

        <span
          className={
            atLimit
              ? "identity-count identity-count-full"
              : "identity-count"
          }
        >
          {items.length}
          {" / "}
          {MAX_ITEMS}
        </span>
      </div>


      {items.length > 0 ? (
        <div className="identity-chip-list">
          {items.map(
            (item, index) => (
              <button
                type="button"
                className="identity-chip"
                key={
                  `${item}-${index}`
                }
                title={
                  `Remove ${item}`
                }
                onClick={() =>
                  removeItem(
                    index
                  )
                }
              >
                <span>
                  {item}
                </span>

                <span
                  className="identity-chip-remove"
                  aria-hidden="true"
                >
                  ×
                </span>
              </button>
            )
          )}
        </div>
      ) : (
        <p className="identity-empty">
          Nothing here yet. Add the
          little things that make you,
          you.
        </p>
      )}


      <div className="identity-add-row">
        <input
          type="text"
          value={input}
          maxLength={
            MAX_ITEM_LENGTH
          }
          disabled={atLimit}
          placeholder={
            atLimit
              ? "You've reached 10"
              : "Writing, nostalgia, Destiny 2..."
          }
          onChange={(event) => {
            setInput(
              event.target.value
            );

            if (error) {
              setError("");
            }
          }}
          onKeyDown={
            handleKeyDown
          }
        />

        <button
          type="button"
          disabled={
            atLimit ||
            !input.trim()
          }
          onClick={addItem}
        >
          Add
        </button>
      </div>


      {error && (
        <p className="identity-error">
          {error}
        </p>
      )}
    </div>
  );
}


export default IdentityItemsEditor;