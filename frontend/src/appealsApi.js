const API_URL =
  import.meta.env.VITE_API_BASE_URL;


async function readJson(response) {
  let data = {};

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

    error.status =
      response.status;

    throw error;
  }

  return data;
}


export async function getMyModerationActions(
  token
) {
  const response = await fetch(
    `${API_URL}/moderation/me`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function createAppeal(
  token,
  moderationActionId,
  reason
) {
  const response = await fetch(
    `${API_URL}/appeals/${moderationActionId}`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify({
        reason,
      }),
    }
  );

  return readJson(response);
}


export async function getMyAppeals(
  token
) {
  const response = await fetch(
    `${API_URL}/appeals/me`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function getPendingAppeals(
  token
) {
  const response = await fetch(
    `${API_URL}/admin/appeals/pending`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function reviewAppeal(
  token,
  appealId,
  decision,
  responseToUser,
  privateAdminNote
) {
  const response = await fetch(
    `${API_URL}/admin/appeals/${appealId}`,
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify({
        decision,

        response_to_user:
          responseToUser,

        private_admin_note:
          privateAdminNote || null,
      }),
    }
  );

  return readJson(response);
}