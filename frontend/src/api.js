const API_URL = import.meta.env.VITE_API_BASE_URL;


async function readJson(response) {
  if (response.status === 204) {
    if (!response.ok) {
      throw new Error(
        "Something went wrong"
      );
    }

    return null;
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.detail || "Something went wrong"
    );

    error.status = response.status;

    throw error;
  }

  return data;
}


function makeAssetUrl(path) {
  if (!path) {
    return null;
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  return `${API_URL}${path}`;
}


function normalizeProfile(profile) {
  if (!profile) {
    return null;
  }

  return {
    ...profile,

    profile_picture_url:
      makeAssetUrl(
        profile.profile_picture_url
      ),
  };
}


export function getChatWebSocketUrl(
  connectionId
) {
  const websocketBase =
    API_URL.replace(
      /^http/,
      "ws"
    );

  return (
    `${websocketBase}/chats/` +
    `${connectionId}/ws`
  );
}


export async function loginUser(
  username,
  password
) {
  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    }
  );

  return readJson(response);
}


export async function registerUser(
  username,
  password,
  fullName,
  major
) {
  const response = await fetch(
    `${API_URL}/auth/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        full_name: fullName,
        major,
      }),
    }
  );

  return readJson(response);
}


export async function getCurrentUser(
  token
) {
  const response = await fetch(
    `${API_URL}/auth/me`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function markVerificationWelcomeSeen(
  token
) {
  const response = await fetch(
    `${API_URL}/auth/verification-welcome-seen`,
    {
      method: "PATCH",
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function getPendingVerifications(
  token
) {
  const response = await fetch(
    `${API_URL}/admin/verifications/pending`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function reviewVerification(
  token,
  verificationId,
  verificationStatus,
  adminNote
) {
  const response = await fetch(
    `${API_URL}/admin/verifications/${verificationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
      body: JSON.stringify({
        status:
          verificationStatus,

        admin_note:
          adminNote,
      }),
    }
  );

  return readJson(response);
}


export async function getPendingProfiles(
  token
) {
  const response = await fetch(
    `${API_URL}/admin/profiles/pending`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  const profiles =
    await readJson(response);

  return profiles.map(
    normalizeProfile
  );
}


export async function reviewProfile(
  token,
  profileId,
  profileStatus,
  adminNote
) {
  const response = await fetch(
    `${API_URL}/admin/profiles/${profileId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
      body: JSON.stringify({
        status:
          profileStatus,

        admin_note:
          adminNote,
      }),
    }
  );

  return readJson(response);
}


export async function getPendingReports(
  token
) {
  const response = await fetch(
    `${API_URL}/admin/reports/pending`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function reviewReport(
  token,
  reportId,
  reviewData
) {
  const response = await fetch(
    `${API_URL}/admin/reports/${reportId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
      body: JSON.stringify(
        reviewData
      ),
    }
  );

  return readJson(response);
}


export async function getPostIts(
  token
) {
  const response = await fetch(
    `${API_URL}/post-its`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function getMyPostIt(
  token
) {
  const response = await fetch(
    `${API_URL}/post-its/me`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  return readJson(response);
}


export async function createPostIt(
  token,
  postIt
) {
  const response = await fetch(
    `${API_URL}/post-its`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
      body:
        JSON.stringify(postIt),
    }
  );

  return readJson(response);
}


export async function updateMyPostIt(
  token,
  postIt
) {
  const response = await fetch(
    `${API_URL}/post-its/me`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
      body:
        JSON.stringify(postIt),
    }
  );

  return readJson(response);
}


export async function getConnections(
  token
) {
  const response = await fetch(
    `${API_URL}/connections`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function createConnection(
  token,
  targetUserId
) {
  const response = await fetch(
    `${API_URL}/connections/${targetUserId}`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function getConnectionSuggestions(
  token
) {
  const response = await fetch(
    `${API_URL}/connections/suggestions`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function getPublicProfile(
  token,
  userId
) {
  const response = await fetch(
    `${API_URL}/profiles/${userId}`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  const profile =
    await readJson(response);

  return normalizeProfile(
    profile
  );
}


export async function getMyProfile(
  token
) {
  const response = await fetch(
    `${API_URL}/profiles/me`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  const profile =
    await readJson(response);

  return normalizeProfile(
    profile
  );
}


export async function updateMyProfile(
  token,
  profileData
) {
  const response = await fetch(
    `${API_URL}/profiles/me`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
      body:
        JSON.stringify(
          profileData
        ),
    }
  );

  const profile =
    await readJson(response);

  return normalizeProfile(
    profile
  );
}


export async function submitMyProfile(
  token
) {
  const response = await fetch(
    `${API_URL}/profiles/me/submit`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function addProfileSong(
  token,
  title,
  artist
) {
  const response = await fetch(
    `${API_URL}/profiles/me/songs`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        artist,
      }),
    }
  );

  return readJson(response);
}


export async function deleteProfileSong(
  token,
  songId
) {
  const response = await fetch(
    `${API_URL}/profiles/me/songs/${songId}`,
    {
      method: "DELETE",
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function uploadProfilePicture(
  token,
  file
) {
  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  const response = await fetch(
    `${API_URL}/profiles/me/picture`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
      body: formData,
    }
  );

  const profile =
    await readJson(response);

  return normalizeProfile(
    profile
  );
}


export async function deleteProfilePicture(
  token
) {
  const response = await fetch(
    `${API_URL}/profiles/me/picture`,
    {
      method: "DELETE",
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function getChats(
  token
) {
  const response = await fetch(
    `${API_URL}/chats`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  const chats =
    await readJson(response);

  return chats.map(
    (chat) => ({
      ...chat,

      profile_picture_url:
        makeAssetUrl(
          chat.profile_picture_url
        ),
    })
  );
}


export async function getChatMessages(
  token,
  connectionId
) {
  const response = await fetch(
    `${API_URL}/chats/${connectionId}/messages`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function markChatRead(
  token,
  connectionId
) {
  const response = await fetch(
    `${API_URL}/chats/${connectionId}/read`,
    {
      method: "PATCH",
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function getMyBlocks(
  token
) {
  const response = await fetch(
    `${API_URL}/blocks`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function blockUser(
  token,
  targetUserId,
  reason
) {
  const response = await fetch(
    `${API_URL}/blocks/${targetUserId}`,
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


export async function reportUser(
  token,
  targetUserId,
  category,
  details
) {
  const response = await fetch(
    `${API_URL}/reports/${targetUserId}`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
      body: JSON.stringify({
        category,
        details,
      }),
    }
  );

  return readJson(response);
}

export async function sendPresenceHeartbeat(
  token
) {
  const response = await fetch(
    `${API_URL}/chats/presence/heartbeat`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function getMyPresence(
  token
) {
  const response = await fetch(
    `${API_URL}/chats/presence/me`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}


export async function updateMyPresence(
  token,
  mode
) {
  const response = await fetch(
    `${API_URL}/chats/presence/me`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
      body: JSON.stringify({
        mode,
      }),
    }
  );

  return readJson(response);
}


export async function getUserPresence(
  token,
  userId
) {
  const response = await fetch(
    `${API_URL}/chats/presence/${userId}`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return readJson(response);
}



export async function replyToVerification(token, response) {
  const result = await fetch(`${API_URL}/auth/verification/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ response }),
  });
  return readJson(result);
}
