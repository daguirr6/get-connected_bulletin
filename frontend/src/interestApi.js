const API_URL =
  import.meta.env.VITE_API_BASE_URL;


async function readJson(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.detail ||
        "Something went wrong"
    );

    error.status = response.status;

    throw error;
  }

  return data;
}


export async function getInterestCatalog(
  token
) {
  const response = await fetch(
    `${API_URL}/profiles/interests/catalog`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function getMyInterests(
  token
) {
  const response = await fetch(
    `${API_URL}/profiles/me/interests`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function updateMyInterests(
  token,
  selectedInterestIds,
  newInterests = []
) {
  const response = await fetch(
    `${API_URL}/profiles/me/interests`,
    {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify({
        selected_interest_ids:
          selectedInterestIds,

        new_interests:
          newInterests,
      }),
    }
  );

  return readJson(response);
}