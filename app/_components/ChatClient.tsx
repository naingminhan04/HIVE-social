"use client";

import {
  createChatAction,
  deleteMessageAction,
  getChatMessagesAction,
  getChatsAction,
  getChatSocketConfigAction,
  getMessageReactionsAction,
  getUnreadMessagesCountAction,
  getPrivateMessagesAction,
  markMessageReadAction,
  removeMessageReactionAction,
  sendChatMessageAction,
  sendPrivateMessageAction,
  setMessageReactionAction,
  updateMessageAction,
} from "@/app/_actions/chat";
import { searchAction } from "@/app/_actions/search";
import OverlayPortal from "@/app/_components/OverlayPortal";
import ImageViewer from "@/app/_components/ImageViewer";
import RecoverableImage from "@/app/_components/RecoverableImage";
import { useAuthStore } from "@/store/auth";
import type {
  Chat,
  ChatMedia,
  ChatMessage,
  ChatReactionType,
  DraftPrivateChat,
  SendMessageInput,
  SelectedChat,
} from "@/types/chat";
import type { SearchUserType } from "@/types/search";
import { formatDate } from "@/utils/formatDate";
import { uploadFiles, type UploadedFile } from "@/utils/uploadUtils";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Edit3,
  FileText,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  Paperclip,
  PenLine,
  Play,
  Plus,
  Reply,
  Search,
  Send,
  SmilePlus,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import toast from "react-hot-toast";
import { io, type Socket } from "socket.io-client";

type ComposeMode = "private" | "group" | null;
type DraftFileKind = "image" | "video" | "audio" | "file";
type DraftFile = {
  id: string;
  file: File;
  previewUrl: string;
  kind: DraftFileKind;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    0: {
      transcript: string;
    };
  }>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const reactionOptions: { type: ChatReactionType; label: string; image: string }[] = [
  { type: "LIKE", label: "Like", image: "/like.png" },
  { type: "LOVE", label: "Love", image: "/love.png" },
  { type: "HAHA", label: "Haha", image: "/haha.png" },
  { type: "WOW", label: "Wow", image: "/wow.png" },
  { type: "SAD", label: "Sad", image: "/sad.png" },
  { type: "ANGRY", label: "Angry", image: "/angry.png" },
];

const reactionStatKeys: Record<ChatReactionType, keyof NonNullable<ChatMessage["reactionStats"]>> = {
  LIKE: "like",
  LOVE: "love",
  HAHA: "haha",
  WOW: "wow",
  SAD: "sad",
  ANGRY: "angry",
};

const getDraftFileKind = (file: File): DraftFileKind => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
};

const getMediaKind = (media: Pick<ChatMedia, "mimeType">): DraftFileKind => {
  const mimeType = media.mimeType.toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const toChatMedia = (file: UploadedFile): ChatMedia => ({
  key: file.key,
  fileName: file.fileName,
  fileSize: file.fileSize,
  mimeType: file.mimeType,
});

const toMessageInputMedia = (media: ChatMedia): ChatMedia => ({
  key: media.key,
  fileName: media.fileName,
  fileSize: media.fileSize,
  mimeType: media.mimeType,
  ...(media.thumbnailKey ? { thumbnailKey: media.thumbnailKey } : {}),
});

const isDraftChat = (chat: SelectedChat | null): chat is DraftPrivateChat =>
  chat?.type === "PRIVATE_DRAFT";

const visibleChatHasMessage = (chat: Chat) =>
  Boolean(chat.lastMessage) || chat.messagesCount > 0;

const getChatTitle = (chat: SelectedChat) => {
  if (isDraftChat(chat)) return chat.user.name;
  if (chat.type === "PRIVATE") return chat.otherUser?.user.name ?? chat.name ?? "Private chat";
  return chat.name || "Group chat";
};

const getChatSubtitle = (chat: Chat, viewerId?: string) => {
  const message = chat.lastMessage;
  if (!message) return chat.type === "GROUP" ? `${chat.participantsCount} members` : "";

  const content = message.content?.trim() || "Attachment";
  if (message.senderId === viewerId) return `You: ${content}`;
  return content;
};

const getChatImage = (chat: SelectedChat) => {
  if (isDraftChat(chat)) return chat.user.profilePic;
  if (chat.type === "PRIVATE") return chat.otherUser?.user.profilePic ?? null;
  return chat.chatImage;
};

const getSelectedKey = (chat: SelectedChat | null) => {
  if (!chat) return "none";
  if (isDraftChat(chat)) return `draft-${chat.user.id}`;
  return chat.id;
};

const makeDraftUser = (params: URLSearchParams): SearchUserType | null => {
  const id = params.get("userId")?.trim();
  if (!id) return null;

  return {
    id,
    name: params.get("name")?.trim() || params.get("username")?.trim() || "New chat",
    username: params.get("username")?.trim() || id,
    profilePic: params.get("profilePic")?.trim() || null,
  };
};

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

const ChatClient = () => {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const viewer = useAuthStore((state) => state.user);
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(() => {
    const draftUser = makeDraftUser(searchParams);
    return draftUser ? { type: "PRIVATE_DRAFT", user: draftUser } : null;
  });
  const [composeMode, setComposeMode] = useState<ComposeMode>(null);
  const [isComposeMenuOpen, setIsComposeMenuOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [draftFiles, setDraftFiles] = useState<DraftFile[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [isVoiceTypingSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const [isVoiceTyping, setIsVoiceTyping] = useState(false);
  const [privateSearch, setPrivateSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupUsers, setGroupUsers] = useState<SearchUserType[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingImages, setEditingImages] = useState<ChatMedia[]>([]);
  const [editingAttachments, setEditingAttachments] = useState<ChatMedia[]>([]);
  const [openReactionMessageId, setOpenReactionMessageId] = useState<string | null>(null);
  const [reactionUsersMessage, setReactionUsersMessage] = useState<ChatMessage | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{
    items: { id: string; url: string; fileName?: string | null; mimeType?: string | null }[];
    index: number;
  } | null>(null);
  const [localReactions, setLocalReactions] = useState<
    Record<string, ChatReactionType | null>
  >({});
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastPositionedChatRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const readMessageIdsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const draftFilesRef = useRef<DraftFile[]>([]);

  const chatsQuery = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const result = await getChatsAction();
      if (!result.success) throw new Error(result.error);
      return result.data.chats.filter(visibleChatHasMessage);
    },
  });

  const chats = useMemo(() => chatsQuery.data ?? [], [chatsQuery.data]);
  const selectedKey = getSelectedKey(selectedChat);

  const unreadQuery = useQuery({
    queryKey: ["chatUnreadCount"],
    queryFn: async () => {
      const result = await getUnreadMessagesCountAction();
      if (!result.success) throw new Error(result.error);
      return result.data.unreadMessagesCount;
    },
  });

  useEffect(() => {
    let isMounted = true;

    getChatSocketConfigAction().then((result) => {
      if (!isMounted || !result.success) return;

      const socket = io(result.data.url, {
        transports: ["websocket", "polling"],
        withCredentials: true,
        auth: result.data.token ? { token: result.data.token } : undefined,
      });

      socketRef.current = socket;
      socket.on("connect", () => setIsSocketConnected(true));
      socket.on("disconnect", () => setIsSocketConnected(false));

      const refreshChat = () => {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        queryClient.invalidateQueries({ queryKey: ["chatMessages"] });
      };

      [
        "message:new",
        "new-message",
        "message-sent",
        "message-updated",
        "message-deleted",
        "message-read",
        "chat-created",
        "chat-updated",
      ].forEach((event) => socket.on(event, refreshChat));
    });

    return () => {
      isMounted = false;
      setIsSocketConnected(false);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  useEffect(() => {
    draftFilesRef.current = draftFiles;
  }, [draftFiles]);

  useEffect(() => {
    return () => {
      draftFilesRef.current.forEach((draftFile) =>
        URL.revokeObjectURL(draftFile.previewUrl),
      );
      speechRecognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!selectedChat || isDraftChat(selectedChat)) return;
    socketRef.current?.emit("join-chat", { chatId: selectedChat.id });
    socketRef.current?.emit("chat:join", selectedChat.id);

    return () => {
      socketRef.current?.emit("leave-chat", { chatId: selectedChat.id });
      socketRef.current?.emit("chat:leave", selectedChat.id);
    };
  }, [selectedChat]);

  const messagesQuery = useQuery({
    queryKey: ["chatMessages", selectedKey],
    queryFn: async () => {
      if (!selectedChat) return [];

      const result = isDraftChat(selectedChat)
        ? await getPrivateMessagesAction(selectedChat.user.id)
        : selectedChat.type === "PRIVATE" && selectedChat.otherUser
          ? await getPrivateMessagesAction(selectedChat.otherUser.userId)
          : await getChatMessagesAction(selectedChat.id);

      if (!result.success) throw new Error(result.error);

      if (isDraftChat(selectedChat) && result.data.chat?.id) {
        setSelectedChat(result.data.chat);
      }

      return sortMessages(result.data.messages);
    },
    enabled: Boolean(selectedChat),
  });

  const reactionUsersQuery = useQuery({
    queryKey: ["chatMessageReactions", reactionUsersMessage?.id],
    queryFn: async () => {
      if (!reactionUsersMessage) return null;
      const result = await getMessageReactionsAction(reactionUsersMessage.id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(reactionUsersMessage),
  });

  const privateSearchQuery = useQuery({
    queryKey: ["chatUserSearch", privateSearch],
    queryFn: async () => {
      const result = await searchAction(privateSearch, 10);
      if (!result.success) throw new Error(result.error);
      return result.data.users.filter((user) => user.id !== viewer?.id);
    },
    enabled: composeMode === "private" && privateSearch.trim().length > 1,
  });

  const groupSearchQuery = useQuery({
    queryKey: ["chatGroupUserSearch", groupSearch],
    queryFn: async () => {
      const result = await searchAction(groupSearch, 12);
      if (!result.success) throw new Error(result.error);
      return result.data.users.filter((user) => user.id !== viewer?.id);
    },
    enabled: composeMode === "group" && groupSearch.trim().length > 1,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChat) throw new Error("Select a chat first");

      const content = messageText.trim();
      if (!content && draftFiles.length === 0) {
        throw new Error("Message cannot be empty");
      }

      const input: SendMessageInput = {
        content,
        ...(replyToMessage ? { parentMessageId: replyToMessage.id } : {}),
      };

      if (draftFiles.length > 0) {
        const uploadedFiles = await uploadFiles(draftFiles.map((draftFile) => draftFile.file));
        const uploadedWithKind = uploadedFiles.map((file, index) => ({
          file: toChatMedia(file),
          kind: draftFiles[index]?.kind ?? getMediaKind(file),
        }));

        const media = uploadedWithKind
          .filter(({ kind }) => kind === "image" || kind === "video")
          .map(({ file }) => file);
        const attachments = uploadedWithKind
          .filter(({ kind }) => kind === "audio" || kind === "file")
          .map(({ file }) => file);

        if (media.length > 0) input.images = media;
        if (attachments.length > 0) input.attachments = attachments;
      }

      const result = isDraftChat(selectedChat)
        ? await sendPrivateMessageAction(selectedChat.user.id, input)
        : selectedChat.type === "PRIVATE" && selectedChat.otherUser
          ? await sendPrivateMessageAction(selectedChat.otherUser.userId, input)
          : await sendChatMessageAction(selectedChat.id, input);

      if (!result.success) throw new Error(result.error);
      return result.data.data;
    },
    onSuccess: async (message) => {
      setMessageText("");
      setReplyToMessage(null);
      setDraftFiles((current) => {
        current.forEach((draftFile) => URL.revokeObjectURL(draftFile.previewUrl));
        return [];
      });
      socketRef.current?.emit("message:sent", message);
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      await queryClient.invalidateQueries({ queryKey: ["chatMessages"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingMessageId) throw new Error("Pick a message to edit");
      const content = editingText.trim();
      if (!content && editingImages.length === 0 && editingAttachments.length === 0 && draftFiles.length === 0) {
        throw new Error("Message cannot be empty");
      }

      const input: SendMessageInput = {
        content,
        images: editingImages.map(toMessageInputMedia),
        attachments: editingAttachments.map(toMessageInputMedia),
      };

      if (draftFiles.length > 0) {
        const uploadedFiles = await uploadFiles(draftFiles.map((draftFile) => draftFile.file));
        const uploadedWithKind = uploadedFiles.map((file, index) => ({
          file: toChatMedia(file),
          kind: draftFiles[index]?.kind ?? getMediaKind(file),
        }));

        input.images = [
          ...(input.images ?? []),
          ...uploadedWithKind
            .filter(({ kind }) => kind === "image" || kind === "video")
            .map(({ file }) => file),
        ];
        input.attachments = [
          ...(input.attachments ?? []),
          ...uploadedWithKind
            .filter(({ kind }) => kind === "audio" || kind === "file")
            .map(({ file }) => file),
        ];
      }

      const result = await updateMessageAction(editingMessageId, input);
      if (!result.success) throw new Error(result.error);
      return result.data.data;
    },
    onSuccess: async () => {
      setEditingMessageId(null);
      setEditingText("");
      setEditingImages([]);
      setEditingAttachments([]);
      setDraftFiles((current) => {
        current.forEach((draftFile) => URL.revokeObjectURL(draftFile.previewUrl));
        return [];
      });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      await queryClient.invalidateQueries({ queryKey: ["chatMessages", selectedKey] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to edit message");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const result = await deleteMessageAction(messageId);
      if (!result.success) throw new Error(result.error);
      return result.data.messageId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      await queryClient.invalidateQueries({ queryKey: ["chatMessages", selectedKey] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete message");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const result = await markMessageReadAction(messageId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async ({
      messageId,
      reactionType,
      currentReaction,
    }: {
      messageId: string;
      reactionType: ChatReactionType;
      currentReaction?: ChatReactionType | null;
    }) => {
      if (currentReaction === reactionType) {
        const result = await removeMessageReactionAction(messageId);
        if (!result.success) throw new Error(result.error);
        return { messageId, reactionType: null };
      }

      const result = await setMessageReactionAction(messageId, reactionType);
      if (!result.success) throw new Error(result.error);
      return { messageId, reactionType };
    },
    onSuccess: async ({ messageId, reactionType }) => {
      setLocalReactions((current) => ({ ...current, [messageId]: reactionType }));
      await queryClient.invalidateQueries({ queryKey: ["chatMessages", selectedKey] });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update reaction");
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const name = groupName.trim();
      if (!name) throw new Error("Group name is required");
      if (groupUsers.length === 0) throw new Error("Pick at least one member");

      const result = await createChatAction({
        type: "GROUP",
        name,
        participantIds: groupUsers.map((user) => user.id),
      });

      if (!result.success) throw new Error(result.error);
      return result.data.chat;
    },
    onSuccess: async (chat) => {
      setSelectedChat(chat);
      setComposeMode(null);
      setGroupName("");
      setGroupSearch("");
      setGroupUsers([]);
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Group created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    },
  });

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const selectedTitle = selectedChat ? getChatTitle(selectedChat) : "Messages";
  const selectedImage = selectedChat ? getChatImage(selectedChat) : null;

  const selectedUserIds = useMemo(
    () => new Set(groupUsers.map((user) => user.id)),
    [groupUsers],
  );

  const openPrivateDraft = (user: SearchUserType) => {
    setSelectedChat({ type: "PRIVATE_DRAFT", user });
    setComposeMode(null);
    setPrivateSearch("");
  };

  const toggleGroupUser = (user: SearchUserType) => {
    setGroupUsers((current) =>
      current.some((member) => member.id === user.id)
        ? current.filter((member) => member.id !== user.id)
        : [...current, user],
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setDraftFiles((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        kind: getDraftFileKind(file),
      })),
    ]);
    event.target.value = "";
  };

  const clearComposer = () => {
    setMessageText("");
    setEditingMessageId(null);
    setEditingText("");
    setEditingImages([]);
    setEditingAttachments([]);
    setDraftFiles((current) => {
      current.forEach((draftFile) => URL.revokeObjectURL(draftFile.previewUrl));
      return [];
    });
  };

  const removeDraftFile = (id: string) => {
    setDraftFiles((current) => {
      const next = current.filter((draftFile) => {
        if (draftFile.id !== id) return true;
        URL.revokeObjectURL(draftFile.previewUrl);
        return false;
      });
      return next;
    });
  };

  const toggleVoiceTyping = () => {
    if (!isVoiceTypingSupported || typeof window === "undefined") return;

    if (isVoiceTyping) {
      speechRecognitionRef.current?.stop();
      setIsVoiceTyping(false);
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();

      if (transcript) {
        setMessageText((current) =>
          current.trim() ? `${current.trim()} ${transcript}` : transcript,
        );
      }
    };
    recognition.onend = () => setIsVoiceTyping(false);
    speechRecognitionRef.current = recognition;
    setIsVoiceTyping(true);
    recognition.start();
  };

  useEffect(() => {
    const unreadMessages = messages.filter(
      (message) =>
        message.senderId !== viewer?.id &&
        !message.isReadByMe &&
        !readMessageIdsRef.current.has(message.id),
    );

    unreadMessages.forEach((message) => {
      readMessageIdsRef.current.add(message.id);
      markReadMutation.mutate(message.id);
    });
  }, [markReadMutation, messages, viewer?.id]);

  useLayoutEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!selectedChat || !viewport || messagesQuery.isLoading) return;

    const isInitialPosition = lastPositionedChatRef.current !== selectedKey;
    const firstUnread = isInitialPosition
      ? messages.find(
          (message) => message.senderId !== viewer?.id && !message.isReadByMe,
        )
      : null;
    const target = firstUnread
      ? viewport.querySelector<HTMLElement>(
          `[data-chat-message-id="${firstUnread.id}"]`,
        )
      : messagesEndRef.current;

    if (!target) return;

    viewport.scrollTop =
      target.offsetTop - viewport.offsetTop - (firstUnread ? 16 : 0);
    lastPositionedChatRef.current = selectedKey;
  }, [
    messages,
    messagesQuery.isLoading,
    selectedChat,
    selectedKey,
    sendMutation.isPending,
    viewer?.id,
  ]);

  const startEditing = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.content ?? "");
    setMessageText("");
    setReplyToMessage(null);
    setEditingImages(message.images ?? []);
    setEditingAttachments(message.attachments ?? []);
    setDraftFiles((current) => {
      current.forEach((draftFile) => URL.revokeObjectURL(draftFile.previewUrl));
      return [];
    });
    setOpenReactionMessageId(null);
  };

  const isEditing = Boolean(editingMessageId);
  const composerText = isEditing ? editingText : messageText;
  const setComposerText = isEditing ? setEditingText : setMessageText;
  const composerIsPending = isEditing ? editMutation.isPending : sendMutation.isPending;
  const composerCanSubmit =
    Boolean(composerText.trim()) ||
    draftFiles.length > 0 ||
    (isEditing && (editingImages.length > 0 || editingAttachments.length > 0));

  const submitComposer = () => {
    if (isEditing) {
      editMutation.mutate();
      return;
    }

    sendMutation.mutate();
  };

  const getCurrentReaction = (message: ChatMessage) =>
    localReactions[message.id] ?? message.myReaction?.reactionType ?? null;

  const getReactionTotal = (message: ChatMessage) =>
    message.reactionStats?.total ?? 0;

  const getVisibleReactions = (message: ChatMessage) => {
    if (!message.reactionStats) return [];

    return reactionOptions
      .map((reaction) => ({
        ...reaction,
        count: message.reactionStats?.[reactionStatKeys[reaction.type]] ?? 0,
      }))
      .filter((reaction) => reaction.count > 0);
  };

  const getReplyPreview = (message: ChatMessage) => {
    if (!message.parentMessage) return null;
    if (typeof message.parentMessage === "string") return message.parentMessage;
    return message.parentMessage.content || "Attachment";
  };

  const openMessageMediaViewer = (items: ChatMedia[], index: number) => {
    const viewerItems = items
      .filter((media) => media.url || media.thumbnailUrl)
      .map((media) => ({
        id: media.id ?? media.key,
        url: media.url ?? media.thumbnailUrl ?? "",
        fileName: media.fileName,
        mimeType: media.mimeType,
      }));

    if (viewerItems.length === 0) return;
    setMediaViewer({ items: viewerItems, index });
  };

  const renderMediaItem = (media: ChatMedia, mediaGroup?: ChatMedia[], index = 0) => {
    const kind = getMediaKind(media);
    const url = media.url || media.thumbnailUrl;

    if (kind === "image" && url) {
      return (
        <button
          key={media.id ?? media.key}
          type="button"
          onClick={() => openMessageMediaViewer(mediaGroup ?? [media], index)}
          className="block max-w-full overflow-hidden rounded-lg bg-neutral-200 text-left dark:bg-neutral-800"
        >
          <RecoverableImage
            src={url}
            alt={media.fileName}
            width={520}
            height={360}
            className="max-h-72 w-full object-cover"
            wrapperClassName="block max-w-full overflow-hidden rounded-lg"
            fallbackSrc="/alt.png"
            showLoadingOverlay
          />
        </button>
      );
    }

    if (kind === "video" && url) {
      return (
        <ChatVideoTile
          key={media.id ?? media.key}
          media={media}
          onOpen={() => openMessageMediaViewer(mediaGroup ?? [media], index)}
        />
      );
    }

    if (kind === "audio" && media.url) {
      return (
        <div
          key={media.id ?? media.key}
          className="rounded-lg bg-black/5 p-2 dark:bg-white/10"
        >
          <p className="mb-1 truncate text-xs opacity-70">{media.fileName}</p>
          <audio src={media.url} controls className="h-10 w-full" />
        </div>
      );
    }

    return (
      <a
        key={media.id ?? media.key}
        href={media.url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-xs hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
      >
        <FileText size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{media.fileName}</span>
        <span className="shrink-0 opacity-60">{formatFileSize(media.fileSize)}</span>
      </a>
    );
  };

  return (
    <main className="relative h-[calc(100dvh-60px)] overflow-hidden bg-neutral-100 p-2 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 lg:h-dvh">
      <div className="h-full overflow-hidden rounded-xl bg-white dark:bg-neutral-900">
        <section
          className={`border-black/5 dark:border-white/10 ${
            selectedChat ? "hidden" : "block"
          }`}
        >
          <div className="border-b border-black/5 px-4 py-5 dark:border-white/10">
            <h2 className="text-2xl font-bold text-slate-700 dark:text-neutral-100">
              Messages
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {unreadQuery.data ?? 0} unread messages
            </p>
          </div>

          {chatsQuery.isLoading ? (
            <div className="space-y-4 p-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex animate-pulse gap-3">
                  <div className="h-13 w-13 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  <div className="min-w-0 flex-1 space-y-2 py-1">
                    <div className="h-4 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-900" />
                  </div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="px-5 py-10 text-sm text-neutral-500 dark:text-neutral-400">
              No conversations yet. Start a chat and send the first message.
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {chats.map((chat) => {
                const isActive = !isDraftChat(selectedChat) && selectedChat?.id === chat.id;
                const avatar = getChatImage(chat);
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => setSelectedChat(chat)}
                    className={`flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition ${
                      isActive
                        ? "bg-blue-50 dark:bg-neutral-900"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <RecoverableImage
                      src={avatar || "/default-avatar.png"}
                      alt={getChatTitle(chat)}
                      width={54}
                      height={54}
                      className="h-13 w-13 rounded-full bg-neutral-200 object-cover"
                      wrapperClassName="h-13 w-13 shrink-0 rounded-full"
                      fallbackSrc="/default-avatar.png"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate font-semibold text-slate-700 dark:text-neutral-100">
                          {getChatTitle(chat)}
                        </span>
                        {chat.lastMessage && (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-neutral-400">
                            {chat.lastMessage.senderId === viewer?.id &&
                              (chat.lastMessage.readCount ?? 0) > 0 && (
                                <CheckCheck size={13} className="text-blue-500" />
                              )}
                            <span>{formatDate(chat.lastMessage.createdAt, false, true)}</span>
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block truncate text-sm text-neutral-400">
                        {getChatSubtitle(chat, viewer?.id)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section
          className={`h-full flex-col overflow-hidden ${
            selectedChat ? "flex" : "hidden"
          }`}
        >
          {selectedChat ? (
            <>
              <div className="flex h-15 items-center gap-3 border-b border-black/5 px-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedChat(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-900"
                  aria-label="Back to chats"
                >
                  <ArrowLeft size={20} />
                </button>
                <RecoverableImage
                  src={selectedImage || "/default-avatar.png"}
                  alt={selectedTitle}
                  width={42}
                  height={42}
                  className="h-10 w-10 rounded-full bg-neutral-200 object-cover"
                  wrapperClassName="h-10 w-10 shrink-0 rounded-full"
                  fallbackSrc="/default-avatar.png"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-slate-700 dark:text-neutral-100">
                    {selectedTitle}
                  </h2>
                  <p className="truncate text-xs text-neutral-400">
                    {isDraftChat(selectedChat)
                      ? `@${selectedChat.user.username}`
                      : selectedChat.type === "GROUP"
                        ? `${selectedChat.participantsCount} members`
                        : `@${selectedChat.otherUser?.user.username ?? "user"}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                    isSocketConnected
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "bg-neutral-100 text-neutral-400 dark:bg-neutral-900"
                  }`}
                >
                  {isSocketConnected ? "Live" : "Offline"}
                </span>
              </div>

              <div
                ref={messagesViewportRef}
                className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 px-3 py-4 pb-5 scrollbar-none dark:bg-neutral-950 sm:px-4"
              >
                {messagesQuery.isLoading ? (
                  <div className="flex h-full items-center justify-center gap-2 text-sm text-neutral-400">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-8 text-center text-sm text-neutral-400">
                    Send a message to start the conversation.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.senderId === viewer?.id;
                    const currentReaction = getCurrentReaction(message);
                    const reactionTotal = getReactionTotal(message);
                    const visibleReactions = getVisibleReactions(message);
                    return (
                      <div
                        key={message.id}
                        data-chat-message-id={message.id}
                        className={`group/message flex items-center gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        {isMine && !message.isDeleted && (
                          <MessageActions
                            isMine={isMine}
                            message={message}
                            currentReaction={currentReaction}
                            openReactionMessageId={openReactionMessageId}
                            setOpenReactionMessageId={setOpenReactionMessageId}
                            setReplyToMessage={setReplyToMessage}
                            startEditing={startEditing}
                            deleteMutation={deleteMutation}
                            reactionMutation={reactionMutation}
                          />
                        )}
                        <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                          <div
                            className={`relative rounded-2xl px-3 py-2 text-sm ${
                              isMine
                                ? "rounded-br-md bg-blue-400 text-white dark:bg-neutral-700"
                                : "rounded-bl-md bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                            }`}
                          >
                            <div className="flex min-w-0 items-start gap-2">
                              <div className="min-w-0 flex-1 space-y-2">
                                {!isMine && (
                                  <p className="mb-1 truncate text-xs font-semibold opacity-70">
                                    {message.sender.name}
                                  </p>
                                )}
                                {getReplyPreview(message) && (
                                  <div
                                    className={`border-l-2 py-1 pl-2 text-xs ${
                                      isMine
                                        ? "border-white/50 text-white/75"
                                        : "border-blue-400 text-neutral-500 dark:text-neutral-400"
                                    }`}
                                  >
                                    <p className="line-clamp-2 break-words">
                                      {getReplyPreview(message)}
                                    </p>
                                  </div>
                                )}
                                {(message.images.length > 0 ||
                                  message.attachments.length > 0) && (
                                  <div className="grid gap-2">
                                    {message.images.map((media, index) =>
                                      renderMediaItem(media, message.images, index),
                                    )}
                                    {message.attachments.map((media, index) =>
                                      renderMediaItem(media, message.attachments, index),
                                    )}
                                  </div>
                                )}
                                {(message.content || message.isDeleted) && (
                                  <p className="whitespace-pre-wrap break-words">
                                    {message.isDeleted
                                      ? "Message deleted"
                                      : message.content}
                                  </p>
                                )}
                              </div>
                            </div>

                            <p
                              className={`mt-1 flex justify-end gap-1 text-right text-[10px] ${
                                isMine ? "text-white/70" : "text-neutral-400"
                              }`}
                            >
                              {message.isEdited && !message.isDeleted && (
                                <span>edited</span>
                              )}
                              <span>{formatDate(message.createdAt, false, true)}</span>
                              {isMine && (
                                <span className="inline-flex items-center gap-0.5">
                                  {(message.readCount ?? 0) > 0 ? (
                                    <>
                                      <CheckCheck size={12} />
                                      Read
                                    </>
                                  ) : (
                                    <>
                                      <Check size={12} />
                                      Sent
                                    </>
                                  )}
                                </span>
                              )}
                            </p>
                          </div>

                          {!message.isDeleted && (
                            <div
                              className={`relative mt-1 flex max-w-full flex-wrap items-center gap-1.5 ${
                                isMine ? "justify-end" : "justify-start"
                              }`}
                            >
                              {visibleReactions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setReactionUsersMessage(message)}
                                  className={`inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-black/10 bg-white px-2 text-xs font-medium text-neutral-600 shadow-sm transition hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 ${
                                    currentReaction ? "ring-1 ring-blue-400/60" : ""
                                  }`}
                                  aria-label="Message reactions"
                                >
                                  <span className="flex -space-x-1">
                                    {visibleReactions.slice(0, 3).map((reaction) => (
                                      <Image
                                        key={reaction.type}
                                        src={reaction.image}
                                        alt={reaction.label}
                                        width={18}
                                        height={18}
                                        className="h-4.5 w-4.5 rounded-full"
                                      />
                                    ))}
                                  </span>
                                  <span>{reactionTotal}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {!isMine && !message.isDeleted && (
                          <MessageActions
                            isMine={isMine}
                            message={message}
                            currentReaction={currentReaction}
                            openReactionMessageId={openReactionMessageId}
                            setOpenReactionMessageId={setOpenReactionMessageId}
                            setReplyToMessage={setReplyToMessage}
                            startEditing={startEditing}
                            deleteMutation={deleteMutation}
                            reactionMutation={reactionMutation}
                          />
                        )}
                      </div>
                    );
                  })
                )}
                {sendMutation.isPending && (
                  <div className="flex justify-end">
                    <div className="max-w-[75%] rounded-2xl rounded-br-md bg-blue-400 px-3 py-2 text-sm text-white opacity-80 dark:bg-neutral-700">
                      <p className="whitespace-pre-wrap break-words">
                        {messageText.trim()}
                      </p>
                      <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/75">
                        <Loader2 size={11} className="animate-spin" />
                        Sending...
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitComposer();
                }}
                className="sticky bottom-0 z-20 border-t border-black/5 bg-white/95 p-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95"
              >
                {isEditing && (
                  <div className="mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-black/10 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200">
                    <Edit3 size={14} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      Editing message
                    </span>
                    <button
                      type="button"
                      onClick={clearComposer}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-blue-100 dark:hover:bg-neutral-800"
                      aria-label="Cancel edit"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {replyToMessage && (
                  <div className="mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-black/10 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300">
                    <Reply size={14} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {replyToMessage.content || "Replying to attachment"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyToMessage(null)}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800"
                      aria-label="Cancel reply"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {isEditing && (editingImages.length > 0 || editingAttachments.length > 0) && (
                  <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {[...editingImages, ...editingAttachments].map((media) => {
                      const kind = getMediaKind(media);
                      const mediaKey = media.id ?? media.key;

                      return (
                        <div
                          key={mediaKey}
                          className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-900"
                        >
                          {kind === "image" && (media.url || media.thumbnailUrl) && (
                            <RecoverableImage
                              src={media.url || media.thumbnailUrl}
                              alt={media.fileName}
                              fill
                              className="object-cover"
                              wrapperClassName="h-full w-full"
                              showLoadingOverlay
                            />
                          )}
                          {kind === "video" && (media.url || media.thumbnailUrl) && (
                            <div className="relative h-full w-full bg-black">
                              <video
                                src={media.url || media.thumbnailUrl}
                                className="h-full w-full object-cover"
                                preload="metadata"
                              />
                              <div className="absolute inset-0 flex items-center justify-center text-white">
                                <Play size={20} fill="currentColor" />
                              </div>
                            </div>
                          )}
                          {(kind === "audio" || kind === "file") && (
                            <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                              {kind === "audio" ? <Mic size={18} /> : <FileText size={18} />}
                              <span className="line-clamp-2 break-all">{media.fileName}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingImages((current) =>
                                current.filter((item) => (item.id ?? item.key) !== mediaKey),
                              );
                              setEditingAttachments((current) =>
                                current.filter((item) => (item.id ?? item.key) !== mediaKey),
                              );
                            }}
                            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                            aria-label="Remove existing attachment"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {draftFiles.length > 0 && (
                  <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {draftFiles.map((draftFile) => (
                      <div
                        key={draftFile.id}
                        className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-neutral-100 dark:border-white/10 dark:bg-neutral-900"
                      >
                        {draftFile.kind === "image" && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={draftFile.previewUrl}
                            alt={draftFile.file.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                        {draftFile.kind === "video" && (
                          <video
                            src={draftFile.previewUrl}
                            className="h-full w-full object-cover"
                          />
                        )}
                        {(draftFile.kind === "audio" || draftFile.kind === "file") && (
                          <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
                            {draftFile.kind === "audio" ? (
                              <Mic size={18} />
                            ) : (
                              <FileText size={18} />
                            )}
                            <span className="line-clamp-2 break-all">
                              {draftFile.file.name}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeDraftFile(draftFile.id)}
                          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                          aria-label="Remove attachment"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100 active:bg-blue-200 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    aria-label="Attach media"
                    title="Attach media"
                  >
                    <Paperclip size={18} />
                  </button>
                  <textarea
                    value={composerText}
                    onChange={(event) => setComposerText(event.target.value)}
                    placeholder={isEditing ? "Edit message" : `Message ${selectedTitle}`}
                    rows={1}
                    className="max-h-28 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm outline-none transition scrollbar-none focus:border-blue-400 dark:border-white/10 dark:bg-neutral-900"
                  />
                  {isVoiceTypingSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceTyping}
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
                        isVoiceTyping
                          ? "border-red-300 bg-red-50 text-red-500 dark:border-red-500/40 dark:bg-red-500/10"
                          : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                      }`}
                      aria-label={isVoiceTyping ? "Stop voice typing" : "Start voice typing"}
                      title={isVoiceTyping ? "Stop voice typing" : "Voice typing"}
                    >
                      {isVoiceTyping ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={
                      composerIsPending ||
                      !composerCanSubmit
                    }
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-400 text-white transition hover:bg-blue-500 active:bg-blue-600 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    aria-label="Send message"
                  >
                    {composerIsPending ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-neutral-400">
              Pick a conversation or start a new one.
            </div>
          )}
        </section>
      </div>

      {!selectedChat && (
        <div className="fixed bottom-5 right-5 z-30 md:absolute lg:bottom-5">
          {isComposeMenuOpen && (
            <div className="mb-3 w-44 overflow-hidden rounded-lg border border-black/10 bg-white py-1 text-sm shadow-xl dark:border-white/10 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => {
                  setComposeMode("private");
                  setIsComposeMenuOpen(false);
                }}
                className="flex h-11 w-full items-center gap-3 px-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <MessageCircle size={17} />
                <span>New Chat</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposeMode("group");
                  setIsComposeMenuOpen(false);
                }}
                className="flex h-11 w-full items-center gap-3 px-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <UsersRound size={17} />
                <span>New Group</span>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsComposeMenuOpen((open) => !open)}
            className="inline-flex h-15 w-15 items-center justify-center rounded-2xl bg-slate-700 text-white shadow-xl transition hover:bg-slate-800 active:scale-95 dark:bg-neutral-100 dark:text-neutral-950"
            aria-label="Compose chat"
          >
            <PenLine size={24} />
          </button>
        </div>
      )}

      {composeMode && (
        <OverlayPortal>
          <div className="fixed inset-0 z-[130] flex items-end bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-950">
              <div className="flex h-14 items-center justify-between border-b border-black/5 px-4 dark:border-white/10">
                <h2 className="font-semibold">
                  {composeMode === "private" ? "New Chat" : "New Group"}
                </h2>
                <button
                  type="button"
                  onClick={() => setComposeMode(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[calc(85dvh-56px)] overflow-y-auto p-4 scrollbar-none">
                {composeMode === "private" ? (
                  <>
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-neutral-900">
                      <Search size={17} className="text-neutral-400" />
                      <input
                        value={privateSearch}
                        onChange={(event) => setPrivateSearch(event.target.value)}
                        placeholder="Search people"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    </div>
                    <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                      {privateSearchQuery.isLoading ? (
                        <p className="py-6 text-center text-sm text-neutral-400">
                          Searching...
                        </p>
                      ) : (
                        (privateSearchQuery.data ?? []).map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => openPrivateDraft(user)}
                            className="flex w-full min-w-0 items-center gap-3 py-3 text-left"
                          >
                            <RecoverableImage
                              src={user.profilePic || "/default-avatar.png"}
                              alt={user.name}
                              width={44}
                              height={44}
                              className="h-11 w-11 rounded-full object-cover"
                              wrapperClassName="h-11 w-11 shrink-0 rounded-full"
                              fallbackSrc="/default-avatar.png"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">
                                {user.name}
                              </span>
                              <span className="block truncate text-sm text-neutral-400">
                                @{user.username}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      value={groupName}
                      onChange={(event) => setGroupName(event.target.value)}
                      placeholder="Group name"
                      className="h-11 w-full rounded-xl border border-black/10 bg-neutral-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-neutral-900"
                    />
                    {groupUsers.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {groupUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleGroupUser(user)}
                            className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-neutral-900 dark:text-neutral-100"
                          >
                            <span className="truncate">{user.name}</span>
                            <X size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-neutral-900">
                      <Search size={17} className="text-neutral-400" />
                      <input
                        value={groupSearch}
                        onChange={(event) => setGroupSearch(event.target.value)}
                        placeholder="Add people"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    </div>
                    <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                      {(groupSearchQuery.data ?? []).map((user) => {
                        const selected = selectedUserIds.has(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleGroupUser(user)}
                            className="flex w-full min-w-0 items-center gap-3 py-3 text-left"
                          >
                            <RecoverableImage
                              src={user.profilePic || "/default-avatar.png"}
                              alt={user.name}
                              width={44}
                              height={44}
                              className="h-11 w-11 rounded-full object-cover"
                              wrapperClassName="h-11 w-11 shrink-0 rounded-full"
                              fallbackSrc="/default-avatar.png"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold">
                                {user.name}
                              </span>
                              <span className="block truncate text-sm text-neutral-400">
                                @{user.username}
                              </span>
                            </span>
                            <span
                              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-blue-500 bg-blue-500 text-white"
                                  : "border-neutral-300"
                              }`}
                            >
                              {selected && <Check size={14} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={createGroupMutation.isPending}
                      onClick={() => createGroupMutation.mutate()}
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-950"
                    >
                      {createGroupMutation.isPending ? (
                        <Loader2 className="animate-spin" size={17} />
                      ) : (
                        <Plus size={17} />
                      )}
                      <span>Create Group</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}

      {reactionUsersMessage && (
        <OverlayPortal>
          <div className="fixed inset-0 z-[130] flex items-end bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
            <div className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-950">
              <div className="flex h-14 items-center justify-between border-b border-black/5 px-4 dark:border-white/10">
                <h2 className="font-semibold text-slate-700 dark:text-neutral-100">
                  Reactions
                </h2>
                <button
                  type="button"
                  onClick={() => setReactionUsersMessage(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  aria-label="Close reactions"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[calc(85dvh-56px)] overflow-y-auto p-4 scrollbar-none">
                {reactionUsersQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-400">
                    <Loader2 size={17} className="animate-spin" />
                    <span>Loading reactions...</span>
                  </div>
                ) : (reactionUsersQuery.data?.reactions ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-400">
                    No reactions yet.
                  </p>
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/10">
                    {(reactionUsersQuery.data?.reactions ?? []).map((reaction) => {
                      const reactionMeta = reactionOptions.find(
                        (item) => item.type === reaction.reactionType,
                      );

                      return (
                        <div
                          key={reaction.id}
                          className="flex min-w-0 items-center gap-3 py-3"
                        >
                          <RecoverableImage
                            src={reaction.user.profilePic || "/default-avatar.png"}
                            alt={reaction.user.name}
                            width={44}
                            height={44}
                            className="h-11 w-11 rounded-full object-cover"
                            wrapperClassName="h-11 w-11 shrink-0 rounded-full"
                            fallbackSrc="/default-avatar.png"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-700 dark:text-neutral-100">
                              {reaction.user.name}
                            </p>
                            <p className="truncate text-sm text-neutral-400">
                              @{reaction.user.username}
                            </p>
                          </div>
                          {reactionMeta && (
                            <Image
                              src={reactionMeta.image}
                              alt={reactionMeta.label}
                              width={28}
                              height={28}
                              className="h-7 w-7 shrink-0"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}

      {mediaViewer && (
        <ImageViewer
          images={mediaViewer.items}
          index={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
          onChange={(index) => setMediaViewer((current) => current ? { ...current, index } : current)}
          showPaginationOnVideo
        />
      )}
    </main>
  );
};

function ChatVideoTile({
  media,
  onOpen,
}: {
  media: ChatMedia;
  onOpen: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const src = media.url || media.thumbnailUrl || "";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block max-w-full overflow-hidden rounded-lg bg-black text-left"
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 text-white">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
      <video
        src={src}
        className="max-h-80 w-full object-cover"
        preload="metadata"
        playsInline
        muted
        onLoadedData={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55">
          <Play size={24} fill="currentColor" />
        </span>
      </div>
    </button>
  );
}

type MessageActionsProps = {
  isMine: boolean;
  message: ChatMessage;
  currentReaction: ChatReactionType | null;
  openReactionMessageId: string | null;
  setOpenReactionMessageId: Dispatch<SetStateAction<string | null>>;
  setReplyToMessage: Dispatch<SetStateAction<ChatMessage | null>>;
  startEditing: (message: ChatMessage) => void;
  deleteMutation: UseMutationResult<string, Error, string>;
  reactionMutation: UseMutationResult<
    { messageId: string; reactionType: ChatReactionType | null },
    Error,
    {
      messageId: string;
      reactionType: ChatReactionType;
      currentReaction?: ChatReactionType | null;
    }
  >;
};

function MessageActions({
  isMine,
  message,
  currentReaction,
  openReactionMessageId,
  setOpenReactionMessageId,
  setReplyToMessage,
  startEditing,
  deleteMutation,
  reactionMutation,
}: MessageActionsProps) {
  return (
    <div className="relative flex shrink-0 items-center rounded-lg border border-black/10 bg-white p-0.5 text-neutral-600 opacity-0 shadow-lg transition group-hover/message:opacity-100 group-focus-within/message:opacity-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300">
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpenReactionMessageId((current) =>
              current === message.id ? null : message.id,
            )
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="React to message"
          title="React"
        >
          <SmilePlus size={16} />
        </button>
        {openReactionMessageId === message.id && (
          <div
            className={`absolute bottom-full z-30 mb-2 flex gap-1 rounded-full border border-black/10 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-neutral-900 ${
              isMine ? "left-0" : "right-0"
            }`}
          >
            {reactionOptions.map((reaction) => (
              <button
                key={reaction.type}
                type="button"
                disabled={reactionMutation.isPending}
                onClick={() => {
                  setOpenReactionMessageId(null);
                  reactionMutation.mutate({
                    messageId: message.id,
                    reactionType: reaction.type,
                    currentReaction,
                  });
                }}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:-translate-y-1 hover:bg-neutral-100 active:scale-95 disabled:opacity-50 dark:hover:bg-neutral-800 ${
                  currentReaction === reaction.type
                    ? "bg-blue-50 ring-1 ring-blue-400 dark:bg-blue-500/10"
                    : ""
                }`}
                aria-label={`React ${reaction.label}`}
                title={reaction.label}
              >
                <Image
                  src={reaction.image}
                  alt={reaction.label}
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setReplyToMessage(message)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
        aria-label="Reply to message"
        title="Reply"
      >
        <Reply size={16} />
      </button>
      {isMine && (
        <>
          <button
            type="button"
            onClick={() => startEditing(message)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Edit message"
            title="Edit"
          >
            <Edit3 size={15} />
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(message.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
            aria-label="Delete message"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </>
      )}
    </div>
  );
}

export default ChatClient;

