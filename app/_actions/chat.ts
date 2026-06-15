"use server";

import { getAuthToken } from "@/app/_actions/cookies";
import api from "@/libs/axios";
import type { ActionResponse } from "@/types/action";
import type {
  Chat,
  ChatListResponse,
  ChatMessagesResponse,
  ChatReactionType,
  ChatSocketConfig,
  CreateChatInput,
  CreateChatResponse,
  DeleteMessageResponse,
  PrivateChatLookupResponse,
  MessageReactionResponse,
  MessageReactionStatusResponse,
  MessageReactionsResponse,
  ReadMessageResponse,
  RemoveMessageReactionResponse,
  ResetUnreadCountResponse,
  SendMessageInput,
  SendMessageResponse,
  UnreadCountResponse,
  UpdateMessageResponse,
  ChatMessagesQueryOptions,
} from "@/types/chat";
import { getApiErrorMessage } from "@/utils/apiError";

const socketUrlFromApiBase = () => {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
};

export async function getChatsAction(
  cursor?: string,
  limit = 50,
): Promise<ActionResponse<ChatListResponse>> {
  try {
    const res = await api.get<ChatListResponse>("/chats", {
      params: {
        cursor,
        limit,
        direction: "older",
      },
    });

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to load chats"),
    };
  }
}

export async function createChatAction(
  input: CreateChatInput,
): Promise<ActionResponse<CreateChatResponse>> {
  try {
    const res = await api.post<CreateChatResponse>("/chats", input);
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to create chat"),
    };
  }
}



export async function getPrivateChatByUserIdAction(
  userId: string,
): Promise<ActionResponse<PrivateChatLookupResponse>> {
  try {
    const res = await api.get<PrivateChatLookupResponse>(
      `/chats/private/${userId}`,
    );
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Private chat not found"),
    };
  }
}

export async function getChatByIdAction(
  chatId: string,
): Promise<ActionResponse<Chat>> {
  try {
    const res = await api.get<Chat>(`/chats/${chatId}`);
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Chat not found"),
    };
  }
}

export async function getChatMessagesAction(
  chatId: string,
  options?: ChatMessagesQueryOptions,
): Promise<ActionResponse<ChatMessagesResponse>> {
  try {
    const res = await api.get<ChatMessagesResponse>(`/chats/${chatId}/messages`, {
      params: {
        direction: options?.direction ?? "older",
        limit: options?.limit ?? 50,
        ...(options?.dateCursor ?? options?.cursor ? { dateCursor: options?.dateCursor ?? options?.cursor } : {}),
        ...(options?.idCursor ? { idCursor: options.idCursor } : {}),
      },
    });

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to load messages"),
    };
  }
}

export async function getPrivateMessagesAction(
  userId: string,
  options?: ChatMessagesQueryOptions,
): Promise<ActionResponse<ChatMessagesResponse>> {
  try {
    const res = await api.get<ChatMessagesResponse>(
      `/messages/private/${userId}`,
      {
        params: {
          direction: options?.direction ?? "older",
          limit: options?.limit ?? 50,
          ...(options?.dateCursor ?? options?.cursor ? { dateCursor: options?.dateCursor ?? options?.cursor } : {}),
          ...(options?.idCursor ? { idCursor: options.idCursor } : {}),
        },
      },
    );

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to load private messages"),
    };
  }
}

export async function sendChatMessageAction(
  chatId: string,
  input: SendMessageInput,
): Promise<ActionResponse<SendMessageResponse>> {
  try {
    const res = await api.post<SendMessageResponse>(
      `/chats/${chatId}/messages`,
      input,
    );

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to send message"),
    };
  }
}

export async function sendPrivateMessageAction(
  userId: string,
  input: SendMessageInput,
): Promise<ActionResponse<SendMessageResponse>> {
  try {
    const res = await api.post<SendMessageResponse>(
      `/messages/private/${userId}`,
      input,
    );

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to send private message"),
    };
  }
}

export async function updateMessageAction(
  messageId: string,
  input: SendMessageInput,
): Promise<ActionResponse<UpdateMessageResponse>> {
  try {
    const res = await api.put<UpdateMessageResponse>(
      `/messages/${messageId}`,
      input,
    );

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to update message"),
    };
  }
}

export async function deleteMessageAction(
  messageId: string,
): Promise<ActionResponse<DeleteMessageResponse>> {
  try {
    const res = await api.delete<DeleteMessageResponse>(`/messages/${messageId}`);
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to delete message"),
    };
  }
}

export async function markMessageReadAction(
  messageId: string,
): Promise<ActionResponse<ReadMessageResponse>> {
  try {
    const res = await api.post<ReadMessageResponse>(`/messages/${messageId}/read`);
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to mark message as read"),
    };
  }
}

export async function getUnreadMessagesCountAction(): Promise<
  ActionResponse<UnreadCountResponse>
> {
  try {
    const res = await api.get<UnreadCountResponse>("/messages/unread-count");
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to load unread count"),
    };
  }
}

export async function resetUnreadMessagesCountAction(): Promise<
  ActionResponse<ResetUnreadCountResponse>
> {
  try {
    const res = await api.post<ResetUnreadCountResponse>(
      "/messages/unread-count/reset",
    );
    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to reset unread count"),
    };
  }
}

export async function setMessageReactionAction(
  messageId: string,
  reactionType: ChatReactionType,
): Promise<ActionResponse<MessageReactionResponse>> {
  try {
    const res = await api.put<MessageReactionResponse>(
      `/messages/${messageId}/reactions`,
      { reactionType },
    );

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to react to message"),
    };
  }
}

export async function removeMessageReactionAction(
  messageId: string,
): Promise<ActionResponse<RemoveMessageReactionResponse>> {
  try {
    const res = await api.delete<RemoveMessageReactionResponse>(
      `/messages/${messageId}/reactions`,
    );

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to remove reaction"),
    };
  }
}

export async function getMessageReactionsAction(
  messageId: string,
): Promise<ActionResponse<MessageReactionsResponse>> {
  try {
    const res = await api.get<MessageReactionsResponse>(
      `/messages/${messageId}/reactions`,
      {
        params: {
          page: 1,
          size: 50,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      },
    );

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to load reactions"),
    };
  }
}

export async function getMessageReactionStatusAction(
  messageId: string,
): Promise<ActionResponse<MessageReactionStatusResponse>> {
  try {
    const res = await api.get<MessageReactionStatusResponse>(
      `/messages/${messageId}/reactions/status`,
    );

    return { success: true, data: res.data };
  } catch (error) {
    return {
      success: false,
      error: getApiErrorMessage(error, "Failed to load reaction status"),
    };
  }
}

export async function getChatSocketConfigAction(): Promise<
  ActionResponse<ChatSocketConfig>
> {
  try {
    return {
      success: true,
      data: {
        url: socketUrlFromApiBase(),
        token: await getAuthToken(),
      },
    };
  } catch {
    return {
      success: false,
      error: "Failed to prepare realtime chat",
    };
  }
}
