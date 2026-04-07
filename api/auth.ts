import { DeviceEventEmitter } from "react-native";

export type UserRole = "elder" | "caregiver";

export type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  emergencyContact?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
  remember?: boolean;
};

export type RegisterPayload = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type UpdateProfilePayload = {
  displayName?: string;
  emergencyContact?: string;
};

const DEFAULT_USER: AuthUser = {
  id: "demo-user-001",
  displayName: "Demo User",
  email: "demo@eldercare.com",
  role: "elder",
  emergencyContact: "John Doe - (555) 123-4567",
};

// const DEFAULT_AUTH_RESPONSE: AuthResponse = {
//   token: "mock-demo-token",
//   user: DEFAULT_USER,
// };

let currentSession: AuthResponse | null = null;

function buildJsonHeaders(token?: string) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  console.log("===== LOGIN REQUEST START =====");
  console.log("Payload:", payload);

  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const API_URL = BASE_URL ? `${BASE_URL}/auth/login` : null;

  console.log("BASE_URL:", BASE_URL);
  console.log("Login endpoint:", API_URL);

  try {
    if (!API_URL) {
      throw new Error("API base URL is missing.");
    }

    const requestBody = {
      email: payload.email,
      password: payload.password,
    };

    console.log("Request body:", requestBody);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(requestBody),
    });

    console.log("Response status:", response.status);

    const rawText = await response.text();
    console.log("Raw response:", rawText);

    let data: any = null;
    const looksLikeJson =
      rawText.trim().startsWith("{") || rawText.trim().startsWith("[");

    if (looksLikeJson) {
      try {
        data = JSON.parse(rawText);
        console.log("Parsed JSON:", data);
      } catch (jsonError) {
        console.error("Login JSON parse failed:", jsonError);
        throw new Error("Backend returned invalid JSON.");
      }
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 400) {
        throw new Error("Invalid credentials");
      }

      throw new Error(
        data?.message || data?.error || rawText || `Login failed: ${response.status}`
      );
    }

    const authResponse: AuthResponse = {
      token: data?.token ?? "",
      user: {
        id: data?.userId ?? data?.id ?? data?.user?.id ?? "",
        displayName:
          data?.displayName ?? data?.user?.displayName ?? payload.email,
        email: data?.email ?? data?.user?.email ?? payload.email,
        role:
          data?.role === "caregiver" || data?.user?.role === "caregiver"
            ? "caregiver"
            : "elder",
        emergencyContact:
          data?.emergencyContact ?? data?.user?.emergencyContact ?? "",
      },
    };

    currentSession = authResponse;

    console.log("Built authResponse:", authResponse);
    console.log("Stored currentSession:", currentSession);
    console.log("===== LOGIN SUCCESS =====");

    return authResponse;
  } catch (error) {
    console.error("===== LOGIN ERROR =====");
    console.error(error);
    throw error;
  }
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  console.log("===== REGISTER REQUEST START =====");
  console.log("Payload:", payload);

if (payload.password.length < 8) {
    console.error("Password length too short");
    throw new Error("Password must be at least 8 characters.");
}

if (payload.password !== payload.confirmPassword) {
    console.error("Password mismatch");
    throw new Error("Passwords do not match.");
}

  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const API_URL = BASE_URL ? `${BASE_URL}/auth/register` : null;

  console.log("BASE_URL:", BASE_URL);
  console.log("Register endpoint:", API_URL);

  try {
    if (!API_URL) {
      throw new Error("API base URL is missing.");
    }

    const requestBody = {
      displayName: payload.displayName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    };

    console.log("Request body:", requestBody);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify(requestBody),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    const rawText = await response.text();
    console.log("Raw response:", rawText);

    let data: any = null;

    try {
      data = JSON.parse(rawText);
      console.log("Parsed JSON:", data);
    } catch (jsonError) {
      console.error("JSON parsing failed:", jsonError);
      throw new Error("Backend did not return valid JSON.");
    }

    if (!response.ok) {
      console.error("Register failed with status:", response.status);
      throw new Error(`Register failed: ${response.status}`);
    }

    DeviceEventEmitter.emit("LoginSuccess", "FUCK");

    const authResponse: AuthResponse = {
      token: data.token ?? "",
      user: {
        id: data.user?.id ?? "unknown",
        displayName: data.user?.displayName ?? payload.displayName,
        email: data.user?.email ?? payload.email,
        role: data.user?.role === "caregiver" ? "caregiver" : payload.role,
      },
    };

    console.log("AuthResponse built:", authResponse);

    currentSession = authResponse;

    console.log("===== REGISTER SUCCESS =====");

    return authResponse;

  } catch (error) {
    console.error("===== REGISTER ERROR =====");
    console.error(error);
    throw error;
  }
}


export async function getProfile(): Promise<AuthUser> {
  try {
    const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
    const API_URL = BASE_URL ? `${BASE_URL}/account` : null;


    if (!API_URL) {
      return currentSession?.user ?? DEFAULT_USER;
    }

    const response = await fetch(API_URL, {
      method: "GET",
      headers: buildJsonHeaders(currentSession?.token),
    });

    if (!response.ok) {
      throw new Error(`Profile request failed: ${response.status}`);
    }

    const data = await response.json();

    const user: AuthUser = {
      id: data.id ?? DEFAULT_USER.id,
      displayName: data.displayName ?? DEFAULT_USER.displayName,
      email: data.email ?? DEFAULT_USER.email,
      role: data.role === "caregiver" ? "caregiver" : "elder",
      emergencyContact: data.emergencyContact ?? DEFAULT_USER.emergencyContact,
    };

    if (currentSession) {
      currentSession.user = user;
    }

    return user;
  } catch (error) {
    console.error("===== PROFILE ERROR =====");
    console.error(error);
    throw error;
  }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  try {
    const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
    const API_URL = BASE_URL ? `${BASE_URL}/account` : null;


    if (!API_URL) {
      const updatedUser = {
        ...(currentSession?.user ?? DEFAULT_USER),
        ...payload,
      };
      currentSession = {
        token: currentSession?.token ?? "mock-demo-token",
        user: updatedUser,
      };
      return updatedUser;
    }

    const response = await fetch(API_URL, {
      method: "PUT",
      headers: buildJsonHeaders(currentSession?.token),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Profile update failed: ${response.status}`);
    }

    const data = await response.json();

    const updatedUser: AuthUser = {
      id: data.id ?? currentSession?.user.id ?? DEFAULT_USER.id,
      displayName: data.displayName ?? payload.displayName ?? currentSession?.user.displayName ?? DEFAULT_USER.displayName,
      email: data.email ?? currentSession?.user.email ?? DEFAULT_USER.email,
      role: data.role === "caregiver" ? "caregiver" : currentSession?.user.role ?? DEFAULT_USER.role,
      emergencyContact:
        data.emergencyContact ??
        payload.emergencyContact ??
        currentSession?.user.emergencyContact ??
        "",
    };

    currentSession = {
      token: currentSession?.token ?? "",
      user: updatedUser,
    };

    return updatedUser;
  } catch (error) {
    console.error("===== UPDATE PROFILE ERROR =====");
    console.error(error);
    throw error;
  }
}

export function getAuthToken(): string | null {
  return currentSession?.token ?? null;
}

export function getCurrentUser(): AuthUser | null {
  return currentSession?.user ?? null;
}

export function buildAuthHeaders(token?: string) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function logoutUser(): Promise<void> {
  try {
    const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
    const API_URL = BASE_URL ? `${BASE_URL}/COMEBACKTOTHIS` : null;

    if (API_URL) {
      await fetch(API_URL, {
        method: "POST",
        headers: buildJsonHeaders(currentSession?.token),
      });
    }
  } catch (error) {
    console.warn("Logout request failed, clearing local mock session anyway:", error);
  } finally {
    currentSession = null;
  }
}
