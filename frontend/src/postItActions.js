const API_URL =
  import.meta.env
    .VITE_API_BASE_URL || "";


export async function deleteMyPostIt(
  token
) {
  const response = await fetch(
    `${API_URL}/post-its/me`,
    {
      method: "DELETE",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  if (response.status === 204) {
    return;
  }

  let data = {};

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }

  throw new Error(
    data.detail ||
      "Unable to remove your Post-it"
  );
}