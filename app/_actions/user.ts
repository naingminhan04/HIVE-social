"use server"

import api from "@/libs/axios";
import axios from "axios";
import { UserResponseType, UserType, UniqueUsernameResponseType} from "@/types/user";
import { APIError } from "@/types/error";
import { ActionResponse } from "@/types/action";
import { ImageType } from "@/types/post";
import { SearchResponseType } from "@/types/search";
import { normalizeUserPayload } from "@/utils/normalizeUser";

export async function getAllUserAction(nextPage: number = 1, limit: number = 10, keyword: string | null): Promise<ActionResponse<UserResponseType>> {
    try {
        const res = await api.get("/users", {
            params: {
                page: nextPage,
                size: limit,
                keyword
            }
        });
        return { success: true, data: res.data };
    } catch (error) {
        let message = "Unexpected error searching users";

        if (axios.isAxiosError(error)) {
            const data = error.response?.data as APIError | undefined;
            message = data?.message || data?.error || "Failed to search users";
        }
        
        return { success: false, error: message };
    }
}

export async function getUserAction(userId: string): Promise<ActionResponse<UserType>> {
    try {
        const res = await api.get(`/users/profile/${userId}`);
        return { success: true, data: res.data.user };
    } catch (error) {
       let message = "Unexpected error loading user's profile";

        if (axios.isAxiosError(error)) {
            const data = error.response?.data as APIError | undefined;
            message = data?.message || data?.error || "Failed to load user's profile";
        }
        
        return { success: false, error: message };
    }
}

export async function getUserByUsernameAction(username: string | null | undefined): Promise<ActionResponse<UserType>> {
    const normalizedUsername =
        typeof username === "string" ? username.trim() : "";

    if (!normalizedUsername) {
        return {
            success: false,
            error: "Invalid username",
        };
    }

    try {
        const res = await api.get(`/users/username/${encodeURIComponent(normalizedUsername)}`);
        const user = normalizeUserPayload(res.data);

        if (user) {
            return { success: true, data: user };
        }
    } catch {}

    try {
        const res = await api.get<UserResponseType>("/users", {
            params: {
                page: 1,
                size: 20,
                keyword: normalizedUsername,
            },
        });

        const matchedUser = res.data.users.find(
            (user) => user.username.toLowerCase() === normalizedUsername.toLowerCase(),
        );

        if (!matchedUser) {
            throw new Error("User not found");
        }

        const profileRes = await api.get(`/users/profile/${matchedUser.id}`);
        const user = normalizeUserPayload(profileRes.data);

        if (user) {
            return { success: true, data: user };
        }
    } catch {}

    try {
        const res = await api.get(`/users/profile/${encodeURIComponent(normalizedUsername)}`);
        const user = normalizeUserPayload(res.data);

        if (user) {
            return { success: true, data: user };
        }
    } catch {}

    try {
        const searchRes = await api.get<SearchResponseType>("/search", {
            params: {
                keyword: normalizedUsername,
                limit: 20,
            },
        });

        const matchedUser = searchRes.data.users.find(
            (user) => user.username.toLowerCase() === normalizedUsername.toLowerCase(),
        );

        if (!matchedUser) {
            throw new Error("User not found");
        }

        const profileRes = await api.get(`/users/profile/${matchedUser.id}`);
        const user = normalizeUserPayload(profileRes.data);

        if (user) {
            return { success: true, data: user };
        }
    } catch (error) {
        let message = "Unexpected error loading user's profile";

        if (axios.isAxiosError(error)) {
            const data = error.response?.data as APIError | undefined;
            message = data?.message || data?.error || "Failed to load user's profile";
        } else if (error instanceof Error) {
            message = error.message;
        }
        
        return { success: false, error: message };
    }

    return {
        success: false,
        error: "Failed to load user's profile",
    };
}

export async function checkUniqueUsernameAction(username: string):Promise<ActionResponse<UniqueUsernameResponseType>> {
    try {
        const res = await api.get(`/users/username/unique`, {
            params: {
                username
            }
        });
        return { success: true, data: res.data };
    } catch (error) {
        let message = "Unexpected error checking username";

        if (axios.isAxiosError(error)) {
            const data = error.response?.data as APIError | undefined;
            message = data?.message || data?.error || "Failed to check username";
        }
        
        return { success: false, error: message };
    }
}

export async function updateUsernameAction(
  username: string,
): Promise<ActionResponse<{ message: string; userId: string; username: string }>> {
    try {
        const res = await api.patch("/users/username", { username });
        return { success: true, data: res.data };
    } catch (error) {
        let message = "Unexpected error updating username";

        if (axios.isAxiosError(error)) {
            const data = error.response?.data as APIError | undefined;
            message = data?.message || data?.error || "Failed to update username";
        }
        
        return { success: false, error: message };
    }
}

export async function updateProfilePicAction(
  profilePic: ImageType,
): Promise<ActionResponse<{ message: string; profilePic: string }>> {
    try {
        const res = await api.patch("/users/profile-pic", { profilePic });
        return { success: true, data: res.data };
    } catch (error) {
        let message = "Unexpected error updating profile picture";

        if (axios.isAxiosError(error)) {
            const data = error.response?.data as APIError | undefined;
            message = data?.message || data?.error || "Failed to update profile picture";
        }
        
        return { success: false, error: message };
    }
}

export async function updateCoverPicAction(coverPic: { key: string; fileName: string; mimeType: string; fileSize: number }): Promise<ActionResponse<{ message: string; coverPic: string }>> {
    try {
        const res = await api.patch("/users/cover-pic", { coverPic });
        return { success: true, data: res.data };
    } catch (error) {
        let message = "Unexpected error updating cover picture";

        if (axios.isAxiosError(error)) {
            const data = error.response?.data as APIError | undefined;
            message = data?.message || data?.error || "Failed to update cover picture";
        }
        
        return { success: false, error: message };
    }
}

export async function changePasswordAction(
  oldPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ActionResponse<{ message: string }>> {
    try {
        const res = await api.patch("/users/change-password", {
            oldPassword,
            newPassword,
            confirmPassword,
        });
        return { success: true, data: res.data };
    } catch (error) {
        let message = "Unexpected error changing password";

        if (axios.isAxiosError(error)) {
            const data = error.response?.data as APIError | undefined;
            message = data?.message || data?.error || "Failed to change password";
        }
        
        return { success: false, error: message };
    }
}

export async function updateProfileAction(data: {
    name?: string;
    nickname?: string;
    bio?: string;
    phone?: string;
}): Promise<
  ActionResponse<{
    message: string;
    user: {
      id: string;
      name: string;
      username: string;
      profilePic: string | null;
      bio: unknown;
      updatedAt: string;
    };
  }>
> {
    try {
        const res = await api.patch("/users/update-profile", data);
        return { success: true, data: res.data };
    } catch (error) {
        let message = "Unexpected error updating profile";

        if (axios.isAxiosError(error)) {
            const data = error.response?.data as APIError | undefined;
            message = data?.message || data?.error || "Failed to update profile";
        }
        
        return { success: false, error: message };
    }
}
