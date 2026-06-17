"use client";

import { useState, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import {
  X,
  Users,
  Image as ImageIcon,
  FileText,
  UserMinus,
  UserPlus,
  Edit,
  Crown,
  Loader2,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import RecoverableImage from "./common/RecoverableImage";
import ImageViewer from "./common/ImageViewer";
import { useAuthStore } from "@/store/auth";
import { useChatNavigation } from "./chat/ChatNavigation";
import {
  Chat,
  ChatParticipant,
  ChatMediaItem,
  ChatAttachmentItem,
} from "@/types/chat";
import {
  getChatParticipantsAction,
  getChatMediaAction,
  leaveChatAction,
  promoteToAdminAction,
  demoteToMemberAction,
  removeParticipantAction,
  updateChatAction,
  getChatAttachmentsAction,
  getPrivateChatByUserIdAction,
} from "@/app/_actions/chat";
import { uploadFiles } from "@/utils/uploadUtils";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import OverlayPortal from "./layout/OverlayPortal";
import { getProfileSlug } from "./layout/SideBar";
import { buildChatPath } from "@/utils/chatRoutes";
import toast from "react-hot-toast";

type GroupInfoModalProps = {
  chat: Chat;
  onClose: () => void;
};

type GroupTab = "members" | "media" | "attachments";

const tabs: {
  id: GroupTab;
  label: string;
  icon: typeof Users;
}[] = [
  { id: "members", label: "Members", icon: Users },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "attachments", label: "Attachments", icon: FileText },
];

const MemberSkeleton = () => (
  <div className="flex items-center gap-3 py-3">
    <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
    <div className="space-y-2 flex-1">
      <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      <div className="h-3 w-20 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
    </div>
  </div>
);

const MediaGridSkeleton = () => (
  <div className="grid grid-cols-3 gap-2">
    {Array.from({ length: 9 }).map((_, i) => (
      <div
        key={i}
        className="aspect-square rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse"
      />
    ))}
  </div>
);

const AttachmentListSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        <div className="h-10 w-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="h-3 w-24 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Users;
  title: string;
  subtitle: string;
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
      <Icon size={32} className="text-neutral-400" />
    </div>
    <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
      {title}
    </p>
    <p className="text-sm text-neutral-500 dark:text-neutral-400">
      {subtitle}
    </p>
  </div>
);

export function GroupInfoModal({ chat, onClose }: GroupInfoModalProps) {
  const viewer = useAuthStore((state) => state.user);
  const router = useRouter();
  const { openChat } = useChatNavigation();

  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [media, setMedia] = useState<ChatMediaItem[]>([]);
  const [attachments, setAttachments] = useState<ChatAttachmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<GroupTab>("members");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(chat.name || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Image Viewer state
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  // Buttons loading states
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [demotingId, setDemotingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);

  const currentUserParticipant = chat.currentParticipant;
  const isOwner = currentUserParticipant?.role === "OWNER";
  const isAdmin = currentUserParticipant?.role === "ADMIN" || isOwner;

  useLockBodyScroll(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [participantsRes, mediaRes, attachmentsRes] = await Promise.all([
          getChatParticipantsAction(chat.id),
          getChatMediaAction(chat.id),
          getChatAttachmentsAction(chat.id),
        ]);

        if (participantsRes.success) {
          setParticipants(participantsRes.data.participants ?? []);
        }
        if (mediaRes.success) {
          setMedia(mediaRes.data.images ?? []);
        }
        if (attachmentsRes.success) {
          setAttachments(attachmentsRes.data.attachments ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch group data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chat.id]);

  const handleLeaveChat = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      await leaveChatAction(chat.id);
      toast.success("Left group successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to leave group");
    }
  };

  const handlePromoteToAdmin = async (participantId: string, userId: string) => {
    if (viewer?.id === userId) return;
    setPromotingId(participantId);
    try {
      await promoteToAdminAction(chat.id, participantId);
      const res = await getChatParticipantsAction(chat.id);
      if (res.success) setParticipants(res.data.participants ?? []);
      toast.success("Promoted to admin");
    } catch (error) {
      toast.error("Failed to promote");
    } finally {
      setPromotingId(null);
    }
  };

  const handleDemoteToMember = async (participantId: string, userId: string) => {
    if (viewer?.id === userId) return;
    setDemotingId(participantId);
    try {
      await demoteToMemberAction(chat.id, participantId);
      const res = await getChatParticipantsAction(chat.id);
      if (res.success) setParticipants(res.data.participants ?? []);
      toast.success("Demoted to member");
    } catch (error) {
      toast.error("Failed to demote");
    } finally {
      setDemotingId(null);
    }
  };

  const handleRemoveParticipant = async (participantId: string, userId: string) => {
    if (viewer?.id === userId) return;
    if (!confirm("Are you sure you want to remove this participant?")) return;
    setRemovingId(participantId);
    try {
      await removeParticipantAction(chat.id, participantId);
      const res = await getChatParticipantsAction(chat.id);
      if (res.success) setParticipants(res.data.participants ?? []);
      toast.success("Removed from group");
    } catch (error) {
      toast.error("Failed to remove participant");
    } finally {
      setRemovingId(null);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      await updateChatAction(chat.id, { name: newName.trim() });
      setEditingName(false);
      toast.success("Group name updated");
    } catch (error) {
      toast.error("Failed to update name");
    }
  };

  const handleUpdateImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploaded = await uploadFiles(files);
      if (uploaded.length > 0) {
        await updateChatAction(chat.id, {
          chatImage: {
            key: uploaded[0].key,
            fileName: uploaded[0].fileName,
            mimeType: uploaded[0].mimeType,
            fileSize: uploaded[0].fileSize,
          },
        });
        toast.success("Group image updated");
      }
    } catch (error) {
      toast.error("Failed to update image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenPrivateChat = async (participant: ChatParticipant) => {
    if (viewer?.id === participant.userId) return;
    setOpeningChatId(participant.userId);
    try {
      const existingChat = await getPrivateChatByUserIdAction(participant.userId);
      if (existingChat.success) {
        openChat(existingChat.data.chat);
        onClose();
        router.push(buildChatPath(existingChat.data.chat));
        return;
      }
      openChat({
        type: "PRIVATE_DRAFT",
        user: {
          id: participant.userId,
          name: participant.user.name,
          username: participant.user.username,
          profilePic: participant.user.profilePic,
        },
      });
      onClose();
      router.push(
        buildChatPath({
          type: "PRIVATE_DRAFT",
          user: {
            id: participant.userId,
            name: participant.user.name,
            username: participant.user.username,
            profilePic: participant.user.profilePic,
          },
        })
      );
    } catch (error) {
      toast.error("Failed to open chat");
    } finally {
      setOpeningChatId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const imageViewerImages = media
    .filter((m) => m.url || m.thumbnailUrl)
    .map((m) => ({
      id: m.id ?? m.key,
      url: m.url ?? m.thumbnailUrl ?? "",
      fileName: m.fileName,
      mimeType: m.mimeType,
    }));

  return (
    <>
      <OverlayPortal>
        <div className="pointer-events-auto fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-md">
          <div className="@container/group-info flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-black/5 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-neutral-900/95">
            {/* Header */}
            <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between gap-4 border-b border-black/5 bg-white/90 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-neutral-900/90">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-neutral-950 dark:text-neutral-50">
                  Group Info
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-black/5 bg-white/80 p-2 text-neutral-600 transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
              >
                <X size={18} />
              </button>
            </div>

            {/* Group Profile */}
            <div className="shrink-0 border-b border-black/5 px-5 py-6 dark:border-white/10">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <RecoverableImage
                    src={chat.chatImage || "/default-avatar.png"}
                    alt="Group"
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover"
                    wrapperClassName="h-20 w-20 rounded-full overflow-hidden"
                    fallbackSrc="/default-avatar.png"
                  />
                  {isAdmin && (
                    <label className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white cursor-pointer">
                      {uploadingImage ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Edit size={14} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpdateImage}
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>

                {editingName ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="px-3 py-2 border border-neutral-200 rounded-lg dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateName}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false);
                        setNewName(chat.name || "");
                      }}
                      className="px-3 py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {chat.name}
                    </h3>
                    {isAdmin && (
                      <button
                        onClick={() => setEditingName(true)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 border-b border-black/5 px-4 py-4 dark:border-white/10 sm:px-5">
              <div className="flex gap-2">
                {tabs.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-1 items-center justify-center rounded-2xl border px-3 py-3 text-sm font-semibold transition sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${
                        activeTab === tab.id
                          ? "border-blue-400 bg-blue-400 text-white shadow-sm dark:border-black dark:bg-black dark:text-white"
                          : "border-black/5 bg-neutral-50 text-neutral-600 hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                      }`}
                    >
                      <span
                        className={`shrink-0 rounded-xl p-2 shadow-sm ${
                          activeTab === tab.id
                            ? "bg-white/20 text-white dark:bg-neutral-900 dark:text-white"
                            : "bg-white text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                        }`}
                      >
                        <TabIcon size={16} />
                      </span>
                      <span className="hidden min-w-0 truncate sm:inline">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-none overscroll-contain sm:p-5">
              {activeTab === "members" && (
                <div className="space-y-2">
                  {loading ? (
                    <MemberSkeleton />
                  ) : participants.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No members yet"
                      subtitle="This group has no members."
                    />
                  ) : (
                    participants.map((participant) => {
                      const isCurrentUser = participant.userId === viewer?.id;
                      return (
                        <div
                          key={participant.participantId}
                          className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl"
                        >
                          <Link
                            href={`/users/${getProfileSlug(participant.user)}`}
                            className="flex items-center gap-3 flex-1 hover:opacity-80 transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                            }}
                          >
                            <RecoverableImage
                              src={participant.user.profilePic || "/default-avatar.png"}
                              alt={participant.user.name}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                              wrapperClassName="h-10 w-10 rounded-full overflow-hidden"
                              fallbackSrc="/default-avatar.png"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-neutral-900 dark:text-white truncate">
                                  {participant.user.name}
                                </span>
                                {participant.role === "OWNER" && (
                                  <Crown size={14} className="text-yellow-500 shrink-0" />
                                )}
                                {participant.role === "ADMIN" && (
                                  <span className="text-xs text-blue-500 font-semibold shrink-0">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                @{participant.user.username}
                              </p>
                            </div>
                          </Link>

                          {!isCurrentUser && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleOpenPrivateChat(participant)}
                                disabled={openingChatId === participant.userId}
                                className="p-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition disabled:opacity-50"
                              >
                                {openingChatId === participant.userId ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <MessageCircle size={16} />
                                )}
                              </button>

                              {isAdmin && participant.role !== "OWNER" && (
                                <>
                                  {participant.role === "MEMBER" && (
                                    <button
                                      onClick={() =>
                                        handlePromoteToAdmin(
                                          participant.participantId,
                                          participant.userId
                                        )
                                      }
                                      disabled={promotingId === participant.participantId}
                                      className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition disabled:opacity-50"
                                    >
                                      {promotingId === participant.participantId ? (
                                        <Loader2 size={16} className="animate-spin" />
                                      ) : (
                                        <UserPlus size={16} />
                                      )}
                                    </button>
                                  )}
                                  {participant.role === "ADMIN" && isOwner && (
                                    <button
                                      onClick={() =>
                                        handleDemoteToMember(
                                          participant.participantId,
                                          participant.userId
                                        )
                                      }
                                      disabled={demotingId === participant.participantId}
                                      className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition disabled:opacity-50"
                                    >
                                      {demotingId === participant.participantId ? (
                                        <Loader2 size={16} className="animate-spin" />
                                      ) : (
                                        <UserMinus size={16} />
                                      )}
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleRemoveParticipant(
                                        participant.participantId,
                                        participant.userId
                                      )
                                    }
                                    disabled={removingId === participant.participantId}
                                    className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                                  >
                                    {removingId === participant.participantId ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <X size={16} />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "media" && (
                <div>
                  {loading ? (
                    <MediaGridSkeleton />
                  ) : media.length === 0 ? (
                    <EmptyState
                      icon={ImageIcon}
                      title="No media yet"
                      subtitle="No images or videos have been shared in this group."
                    />
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {media.map((item, index) => (
                        <button
                          key={item.id || index}
                          type="button"
                          onClick={() => {
                            const viewerIndex = imageViewerImages.findIndex(
                              (img) => img.id === (item.id ?? item.key)
                            );
                            if (viewerIndex !== -1) {
                              setImageViewerIndex(viewerIndex);
                              setShowImageViewer(true);
                            }
                          }}
                          className="aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 hover:opacity-90 transition"
                        >
                          {item.thumbnailUrl || item.url ? (
                            <RecoverableImage
                              src={item.thumbnailUrl || item.url || ""}
                              alt={item.fileName}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                              wrapperClassName="w-full h-full"
                              fallbackSrc="/alt.png"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={24} className="text-neutral-400" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "attachments" && (
                <div>
                  {loading ? (
                    <AttachmentListSkeleton />
                  ) : attachments.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="No attachments yet"
                      subtitle="No files have been shared in this group."
                    />
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((item, index) => (
                        <a
                          key={item.id || index}
                          href={item.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-200 dark:bg-neutral-700">
                            <FileText size={20} className="text-neutral-500 dark:text-neutral-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                              {item.fileName}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {formatFileSize(item.fileSize)}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Leave Group Button */}
            <div className="shrink-0 border-t border-black/5 px-5 py-4 dark:border-white/10">
              <button
                onClick={handleLeaveChat}
                className="w-full h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
              >
                Leave Group
              </button>
            </div>
          </div>
        </div>
      </OverlayPortal>

      {/* Image Viewer */}
      {showImageViewer && imageViewerImages.length > 0 && (
        <ImageViewer
          images={imageViewerImages}
          index={imageViewerIndex}
          onClose={() => setShowImageViewer(false)}
          onChange={setImageViewerIndex}
          showPaginationOnVideo
        />
      )}
    </>
  );
}
