const API_URL =
  import.meta.env
    .VITE_API_BASE_URL || "";


export async function sendFeedback(
  {
    area,
    topic,
    message,
    includeUsername,
  }
) {
  const token =
    sessionStorage.getItem(
      "access_token"
    );


  const headers = {
    "Content-Type":
      "application/json",
  };


  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }


  const response =
    await fetch(
      `${API_URL}/feedback`,
      {
        method: "POST",

        headers,

        body: JSON.stringify({
          area,

          topic,

          message,

          include_username:
            includeUsername,
        }),
      }
    );


  let data = null;


  try {
    data =
      await response.json();
  } catch {
    data = null;
  }


  if (!response.ok) {
    throw new Error(
      data?.detail ||
        "Feedback could not be sent."
    );
  }


  return data;
}