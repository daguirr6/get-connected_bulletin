const API_URL =
  import.meta.env
    .VITE_API_BASE_URL || "";


async function adminRequest(
  path,
  token,
  options = {}
) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,

      headers: {
        Authorization:
          `Bearer ${token}`,

        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),

        ...(options.headers || {}),
      },
    }
  );

  let data = null;

  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        "Admin request failed"
    );
  }

  return data;
}


export function getAdminPostIts(
  token
) {
  return adminRequest(
    "/admin/post-its",
    token
  );
}


export function removeAdminPostIt(
  token,
  postItId,
  reason
) {
  return adminRequest(
    `/admin/post-its/${postItId}`,
    token,
    {
      method: "DELETE",
      body: JSON.stringify({
        reason,
      }),
    }
  );
}


export function getAdminUsers(
  token
) {
  return adminRequest(
    "/admin/users",
    token
  );
}


export function getWeeklyAnalytics(
  token
) {
  return adminRequest(
    "/admin/analytics/weekly",
    token
  );
}


export function setAdminUserStatus(
  token,
  userId,
  accountStatus,
  reason
) {
  return adminRequest(
    `/admin/users/${userId}/status`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({
        account_status:
          accountStatus,
        reason,
      }),
    }
  );
}


export function deleteAdminUser(
  token,
  userId,
  confirmUsername,
  reason
) {
  return adminRequest(
    `/admin/users/${userId}`,
    token,
    {
      method: "DELETE",
      body: JSON.stringify({
        confirm_username:
          confirmUsername,
        reason,
      }),
    }
  );
}