"use server";

import api from "@/libs/axios";
import { ActionResponse } from "@/types/action";
import type {
  NotificationUnreadCountResponse,
  NotificationsResponse,
} from "@/types/notification";
import { getApiErrorMessage } from "@/utils/apiError";

export async function getNotificationsAction(
  page = 1,
  size = 15,
): Promise<ActionResponse<NotificationsResponse>> {
  try {
    const res = await api.get<NotificationsResponse>("/notification/my", {
      params: { page, size },
    });
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to load notifications"),
    };
  }
}

export async function getUnreadNotificationCountAction(): Promise<
  ActionResponse<NotificationUnreadCountResponse>
> {
  try {
    const res = await api.get<NotificationUnreadCountResponse>(
      "/notification/unread-count",
    );
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to load notification count"),
    };
  }
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResponse<{ message: string; notificationId: string; isRead: boolean }>> {
  try {
    const res = await api.patch<{
      message: string;
      notificationId: string;
      isRead: boolean;
    }>(`/notification/${notificationId}/read`);
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to mark notification as read"),
    };
  }
}

