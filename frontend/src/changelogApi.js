const API_URL =
  import.meta.env.VITE_API_BASE_URL;


async function readJson(
  response
) {
  let data;

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error =
      new Error(
        data.detail ||
        "Could not load What's New"
      );

    error.status =
      response.status;

    throw error;
  }

  return data;
}


export async function getChangelog(
  token
) {
  const response =
    await fetch(
      `${API_URL}/changelog`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return readJson(
    response
  );
}


export async function markChangelogSeen(
  token
) {
  const response =
    await fetch(
      `${API_URL}/changelog/seen`,
      {
        method: "PATCH",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return readJson(
    response
  );
}