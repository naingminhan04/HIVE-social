"use client";

import {
  getUserByUsernameAction,
  checkUniqueUsernameAction,
  updateUsernameAction,
  updateCoverPicAction,
  updateProfilePicAction,
  updateProfileAction,
  changePasswordAction,
} from "@/app/_actions/user";
import {
  createThoughtAction,
  deleteThoughtAction,
  getActiveThoughtByUserAction,
} from "@/app/_actions/thought";
import {
  createProfileViewAction,
  getProfileViewsAction,
} from "@/app/_actions/profileView";
import { uploadFiles } from "@/utils/uploadUtils";
import { GlobalSettings } from "@/utils/global-settings";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ChevronLeft,
  Coins,
  ShieldCheck,
  PencilLine,
  X,
  Camera,
  Loader2,
  UserRoundCog,
  KeyRound,
  AtSign,
  ImageUp,
  MessageCircle,
  UserRound,
  Eye,
  Send,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SubmitHandler, useForm } from "react-hook-form";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import PostReel from "../post/PostReel";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ImageViewer from "@/app/_components/common/ImageViewer";
import DummyProfile from "@/app/_components/common/DummyProfile";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import OverlayPortal from "../layout/OverlayPortal";
import RecoverableImage from "../common/RecoverableImage";
import { buildChatPath } from "@/utils/chatRoutes";
import { getPrivateChatByUserIdAction } from "@/app/_actions/chat";

type ProfileFormValues = {
  name: string;
  bio: string;
};

type UsernameFormValues = {
  username: string;
};

type PasswordFormValues = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type EditProfileTab = "photo" | "basic" | "username" | "password";

type ProfileProps = {
  username: string;
  isPortal?: boolean;
};

const Profile = ({ username, isPortal = false }: ProfileProps) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewer = useAuthStore((state) => state.user);
  const setViewer = useAuthStore((state) => state.setUser);
  const viewerId = viewer?.id;
  const normalizedUsername = username.trim();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [selectedProfileFile, setSelectedProfileFile] = useState<File | null>(
    null,
  );
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(
    null,
  );
  const [imageView, setImageView] = useState<"cover" | "profile" | null>(null);
  const [isCoverPending, setIsCoverPending] = useState(false);
  const [isProfilePicPending, setIsProfilePicPending] = useState(false);
  const [isProfilePending, setIsProfilePending] = useState(false);
  const [isUsernamePending, setIsUsernamePending] = useState(false);
  const [isPasswordPending, setIsPasswordPending] = useState(false);
  const [isMessagePending, setIsMessagePending] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<EditProfileTab>("photo");
  const [isThoughtOpen, setIsThoughtOpen] = useState(false);
  const [thoughtText, setThoughtText] = useState("");
  const [isViewsOpen, setIsViewsOpen] = useState(false);
  const profileViewsSentinelRef = useRef<HTMLDivElement | null>(null);

  const editTabs: {
    id: EditProfileTab;
    label: string;
    icon: LucideIcon;
  }[] = [
      { id: "photo", label: "Photo", icon: ImageUp },
      { id: "basic", label: "Basic Info", icon: UserRoundCog },
      { id: "username", label: "Username", icon: AtSign },
      { id: "password", label: "Password", icon: KeyRound },
    ];

  useLockBodyScroll(isEditOpen || isThoughtOpen || isViewsOpen);

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user", normalizedUsername],
    queryFn: async () => {
      const result = await getUserByUsernameAction(normalizedUsername);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!normalizedUsername,
  });

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: "",
      bio: "",
    },
  });

  const {
    register: registerUsername,
    handleSubmit: handleSubmitUsername,
    reset: resetUsername,
  } = useForm<UsernameFormValues>({
    defaultValues: {
      username: "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
  } = useForm<PasswordFormValues>();

  const isOwner = viewerId === user?.id;

  const thoughtQuery = useQuery({
    queryKey: ["activeThought", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const result = await getActiveThoughtByUserAction(user.id);
      if (!result.success) throw new Error(result.error);
      return result.data.thought;
    },
    enabled: !!user?.id,
    retry: false,
  });

  const profileViewsQuery = useInfiniteQuery({
    queryKey: ["profileViews"],
    queryFn: async ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1;
      const result = await getProfileViewsAction({ page, size: 20 });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.metadata.nextPage ?? undefined,
    enabled: isOwner && isViewsOpen,
    retry: false,
  });
  const {
    fetchNextPage: fetchNextProfileViewsPage,
    hasNextPage: hasMoreProfileViews,
    isFetchingNextPage: isFetchingMoreProfileViews,
  } = profileViewsQuery;

  const createThoughtMutation = useMutation({
    mutationFn: async (text: string) => {
      const result = await createThoughtAction(text);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: async (data) => {
      setThoughtText("");
      setIsThoughtOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["activeThought", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["pointsSummary"] });
      await queryClient.invalidateQueries({ queryKey: ["pointsInfo"] });
      if (viewer && data.thought.userId === viewer.id) {
        setViewer({
          ...viewer,
          points: Math.max(0, (viewer.points ?? 0) - GlobalSettings.thoughtCreationCost),
        });
      }
      toast.success(data.message || "Thought shared");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteThoughtMutation = useMutation({
    mutationFn: async (thoughtId: string) => {
      const result = await deleteThoughtAction(thoughtId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["activeThought", user?.id] });
      toast.success(data.message || "Thought deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!user) return;
    resetProfile({
      name: user.name ?? "",
      bio: user.bio ?? "",
    });
    resetUsername({
      username: user.username ?? "",
    });
  }, [resetProfile, resetUsername, user]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    };
  }, [coverPreviewUrl, profilePreviewUrl]);

  useEffect(() => {
    if (!isEditOpen) {
      setActiveEditTab("photo");
    }
  }, [isEditOpen]);

  useEffect(() => {
    if (!user?.id || !viewerId || isOwner) return;
    void createProfileViewAction(user.id);
  }, [isOwner, user?.id, viewerId]);

  useEffect(() => {
    if (searchParams.get("profileViews") === "1" && isOwner) {
      setIsViewsOpen(true);
    }
  }, [isOwner, searchParams]);

  useEffect(() => {
    if (!isViewsOpen) return;
    const sentinel = profileViewsSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry?.isIntersecting &&
          hasMoreProfileViews &&
          !isFetchingMoreProfileViews
        ) {
          void fetchNextProfileViewsPage();
        }
      },
      { rootMargin: "160px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    isViewsOpen,
    fetchNextProfileViewsPage,
    hasMoreProfileViews,
    isFetchingMoreProfileViews,
  ]);

  const syncUser = async () => {
    await queryClient.invalidateQueries({ queryKey: ["user"] });
    const refreshed = await refetch();
    if (isOwner && refreshed.data) {
      setViewer(refreshed.data);
    }
  };

  const onSubmitProfile: SubmitHandler<ProfileFormValues> = async (data) => {
    const payload = {
      name: data.name.trim(),
      bio: data.bio.trim() || undefined,
    };

    setIsProfilePending(true);
    const toastId = toast.loading("Updating profile...");
    try {
      const result = await updateProfileAction(payload);
      if (!result.success) throw new Error(result.error);
      if (isOwner && viewer) {
        setViewer({
          ...viewer,
          name: payload.name || viewer.name,
          bio: payload.bio ?? null,
        });
      }
      await syncUser();
      // Revalidate points after profile update
      await queryClient.invalidateQueries({ queryKey: ["pointsInfo"] });
      await queryClient.invalidateQueries({ queryKey: ["pointsSummary"] });
      toast.success("Profile updated", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update", {
        id: toastId,
      });
    } finally {
      setIsProfilePending(false);
    }
  };

  const onSubmitUsername: SubmitHandler<UsernameFormValues> = async (data) => {
    const nextUsername = data.username.trim();
    if (!nextUsername) {
      toast.error("Username is required");
      return;
    }

    if (nextUsername === user?.username) {
      toast("Username is unchanged", { id: "username-unchanged" });
      return;
    }

    setIsUsernamePending(true);
    const toastId = toast.loading("Updating username...");
    try {
      const unique = await checkUniqueUsernameAction(nextUsername);
      if (!unique.success) throw new Error(unique.error);
      if (!unique.data.isUnique) throw new Error("Username is already taken");

      const result = await updateUsernameAction(nextUsername);
      if (!result.success) throw new Error(result.error);
      toast.success("Username updated", { id: toastId });

      if (isOwner) {
        if (viewer) {
          setViewer({ ...viewer, username: result.data.username });
        }
        setIsEditOpen(false);
        // Revalidate points after username change
        await queryClient.invalidateQueries({ queryKey: ["pointsInfo"] });
        await queryClient.invalidateQueries({ queryKey: ["pointsSummary"] });
        if (!isPortal) {
          router.replace(`/users/${result.data.username}`);
        }
      } else {
        await syncUser();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update", {
        id: toastId,
      });
    } finally {
      setIsUsernamePending(false);
    }
  };

  const onSubmitPassword: SubmitHandler<PasswordFormValues> = async (data) => {
    if (user?.hasPassword && !data.oldPassword) {
      toast.error("Old password is required");
      return;
    }

    if (!data.newPassword) {
      toast.error("New password is required");
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setIsPasswordPending(true);
    const toastId = toast.loading("Changing password...");
    try {
      const result = await changePasswordAction(
        user?.hasPassword ? data.oldPassword : "",
        data.newPassword,
        data.confirmPassword,
      );
      if (!result.success) throw new Error(result.error);
      if (isOwner && viewer) {
        setViewer({ ...viewer, hasPassword: true });
      }
      resetPassword();
      toast.success(user?.hasPassword ? "Password changed" : "Password added", {
        id: toastId,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change", {
        id: toastId,
      });
    } finally {
      setIsPasswordPending(false);
    }
  };

  const saveCoverPicture = async () => {
    if (!selectedCoverFile) return;
    setIsCoverPending(true);
    const toastId = toast.loading("Updating cover photo...");
    try {
      const uploaded = await uploadFiles([selectedCoverFile]);
      if (!uploaded.length) throw new Error("Upload failed");
      const image = uploaded[0];

      const result = await updateCoverPicAction({
        key: image.key,
        fileName: image.fileName,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
      });
      if (!result.success) throw new Error(result.error);
      if (isOwner && viewer) {
        setViewer({
          ...viewer,
          coverPic: result.data.coverPic,
        });
      }

      await syncUser();
      toast.success("Cover photo updated", { id: toastId });
      setSelectedCoverFile(null);
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
        setCoverPreviewUrl(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update", {
        id: toastId,
      });
    } finally {
      setIsCoverPending(false);
    }
  };

  const saveProfilePicture = async () => {
    if (!selectedProfileFile) return;
    setIsProfilePicPending(true);
    const toastId = toast.loading("Updating profile photo...");
    try {
      const uploaded = await uploadFiles([selectedProfileFile]);
      if (!uploaded.length) throw new Error("Upload failed");
      const image = uploaded[0];

      const result = await updateProfilePicAction({
        key: image.key,
        fileName: image.fileName,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
      });
      if (!result.success) throw new Error(result.error);
      if (isOwner && viewer) {
        setViewer({
          ...viewer,
          profilePic: result.data.profilePic,
        });
      }

      await syncUser();
      toast.success("Profile photo updated", { id: toastId });
      setSelectedProfileFile(null);
      if (profilePreviewUrl) {
        URL.revokeObjectURL(profilePreviewUrl);
        setProfilePreviewUrl(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update", {
        id: toastId,
      });
    } finally {
      setIsProfilePicPending(false);
    }
  };

  const hasSelectedPhotoChanges = Boolean(selectedProfileFile || selectedCoverFile);
  const isPhotoSavePending = isProfilePicPending || isCoverPending;

  const saveSelectedPhotos = async () => {
    if (!hasSelectedPhotoChanges || isPhotoSavePending) return;

    if (selectedProfileFile) {
      await saveProfilePicture();
    }

    if (selectedCoverFile) {
      await saveCoverPicture();
    }
  };

  const cancelSelectedPhotos = () => {
    if (isPhotoSavePending) return;

    setSelectedProfileFile(null);
    setSelectedCoverFile(null);

    if (profilePreviewUrl) {
      URL.revokeObjectURL(profilePreviewUrl);
      setProfilePreviewUrl(null);
    }

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }
  };

  if (isLoading) return <DummyProfile isPortal={isPortal} />;
  if (error) {
    return (
      <div className="flex min-h-[calc(100dvh-60px)] items-center justify-center bg-white dark:bg-neutral-950 lg:min-h-dvh">
        <div className="text-center space-y-2">
          <p className="text-red-500">Error loading profile</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded-md bg-blue-500 text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayedCoverSrc = coverPreviewUrl || user?.coverPic || null;
  const displayedProfileSrc =
    profilePreviewUrl || user?.profilePic || "/default-avatar.png";
  const profileTitle = isOwner ? "Profile" : `${user?.name ?? "User"}'s Profile`;
  const activeThought = thoughtQuery.data;
  const profileViews =
    profileViewsQuery.data?.pages.flatMap((page) => page.views) ?? [];
  const canManageThought =
    isOwner || viewer?.role === "ADMIN" || viewer?.role === "SUPER_ADMIN";

  const openMessage = async () => {
    if (!user?.id || !user.username || isMessagePending) return;

    setIsMessagePending(true);
    try {
      const existingChat = await getPrivateChatByUserIdAction(user.id);
      if (existingChat.success) {
        router.push(buildChatPath(existingChat.data.chat));
        return;
      }

      router.push(
        buildChatPath({
          type: "PRIVATE_DRAFT",
          user: {
            id: user.id,
            name: user.name ?? user.username,
            username: user.username,
            profilePic: user.profilePic ?? null,
          },
        }),
      );
    } finally {
      setIsMessagePending(false);
    }
  };

  return (
    <main
      className={`@container/profile bg-white relative text-sm sm:text-base dark:bg-neutral-900 ${isPortal ? "min-h-full" : "lg:min-h-dvh min-h-[calc(100dvh-60px)]"
        }`}
    >
      <div
        className={`z-30 flex h-15 w-full justify-between bg-white/95 font-semibold backdrop-blur dark:bg-neutral-900/95 ${isPortal
          ? "sticky top-0 items-center gap-2 border-b border-black/5 px-3 dark:border-white/10"
          : "sticky top-15 items-center border-b border-black/5 px-3 dark:border-white/10 lg:top-0"
          }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {!isPortal && (
            <button
              onClick={() => router.back()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100 active:bg-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700"
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-400 text-white dark:bg-white dark:text-black">
            <UserRound size={16} />
          </span>
          <span className="truncate text-sm text-neutral-950 dark:text-neutral-50 sm:text-base">
            {profileTitle}
          </span>
        </div>

        {isOwner ? (
          <div className="ml-2 flex shrink-0 items-center gap-1">
            <button
              onClick={() => setIsViewsOpen(true)}
              className={`inline-flex shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-neutral-700 shadow-sm transition hover:bg-blue-100 active:bg-blue-200 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700 ${isPortal ? "h-9 w-9" : "h-9 gap-2 px-3 sm:h-10 sm:px-4"
                }`}
              aria-label="View profile viewers"
            >
              <Eye size={16} />
              {!isPortal ? (
                <span className="hidden text-sm font-medium sm:inline">Views</span>
              ) : null}
            </button>
            <button
              onClick={() => setIsEditOpen(true)}
              className={`inline-flex shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-neutral-700 shadow-sm transition hover:bg-blue-100 active:bg-blue-200 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700 ${isPortal ? "h-9 w-9" : "h-9 gap-2 px-3 sm:h-10 sm:px-4"
                }`}
              aria-label="Edit profile"
            >
              <PencilLine size={16} />
              {!isPortal ? (
                <span className="hidden text-sm font-medium sm:inline">Edit Profile</span>
              ) : null}
            </button>
          </div>
        ) : user?.id ? (
          <button
            onClick={openMessage}
            disabled={isMessagePending}
            className="ml-2 inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-2xl border border-blue-300 bg-blue-300 px-3 text-sm text-neutral-950 shadow-sm transition hover:bg-blue-400 hover:text-white active:bg-blue-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black sm:h-10 sm:px-4"
            aria-label={`Message ${user.name}`}
          >
            {isMessagePending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MessageCircle size={16} />
            )}
            <span className="hidden text-sm font-medium sm:inline">
              {isMessagePending ? "Opening..." : "Message"}
            </span>
          </button>
        ) : null}
      </div>

      <div className="relative mb-[13vw] md:mb-[8vw] lg:mb-[clamp(10px,5vw,60px)]">
        <div className="w-full aspect-5/2 relative bg-gray-300">
          {coverPreviewUrl ? (
            <Image
              src={coverPreviewUrl}
              onClick={() => setImageView("cover")}
              fill
              sizes="(min-width: 1024px) 66vw, 100vw"
              alt="Cover photo preview"
              className="object-cover"
            />
          ) : (
            user?.coverPic && (
              <RecoverableImage
                src={user.coverPic}
                onClick={() => setImageView("cover")}
                fill
                sizes="(min-width: 1024px) 66vw, 100vw"
                alt="Cover photo"
                className="object-cover"
                wrapperClassName="h-full w-full"
                showRetryButton
                retryButtonClassName="h-10 w-10"
              />
            )
          )}
        </div>

        <div className="absolute z-20 w-3/14 -bottom-2/9 left-1/10">
          <RecoverableImage
            src={
              profilePreviewUrl
                ? profilePreviewUrl
                : user?.profilePic || "/default-avatar.png"
            }
            alt="Profile picture"
            width={200}
            height={200}
            className="object-cover p-[1vw] md:p-[0.6vw] lg:p-[clamp(5px,1vw,7px)] border-0 bg-white dark:bg-neutral-900 w-full aspect-square relative rounded-full"
            wrapperClassName="w-full aspect-square rounded-full"
            fallbackSrc="/default-avatar.png"
            showRetryButton
            retryButtonClassName="h-9 w-9"
            onClick={() =>
              (user?.profilePic || profilePreviewUrl) && setImageView("profile")
            }
          />
        </div>

        {(activeThought || isOwner) && (
          <button
            type="button"
            onClick={() => isOwner && setIsThoughtOpen(true)}
            disabled={!isOwner}
            className="absolute bottom-[-30%] left-[27%] z-20 max-w-[65%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-left text-xs text-neutral-800 shadow-lg ring-1 ring-black/10 transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-xl disabled:cursor-default dark:bg-neutral-800 dark:text-neutral-100 dark:ring-white/10 sm:text-sm before:absolute before:-left-1 before:top-2.5 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-black/10 before:bg-inherit dark:before:border-white/10"
            aria-label={isOwner ? "Edit thought" : "User thought"}
            title={activeThought?.text ?? "Share a thought"}
          >
            <span className={`block ${activeThought ? "" : "text-neutral-400"} truncate`}>
              {activeThought?.text || "Share a thought"}
            </span>
          </button>
        )}
      </div>

      <section className="mt-2 space-y-6 px-4 pb-4 md:mt-2 lg:mt-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="flex min-w-0 items-center font-semibold text-[clamp(1.5rem,6cqw,2.25rem)] text-black dark:text-white">
              <span className="min-w-0 truncate">{user?.name}</span>
              {user?.role === "ADMIN" && (
                <span
                  onClick={() => {
                    toast("This user is an admin", {
                      icon: (
                        <ShieldCheck className="text-blue-500 dark:text-green-400" />
                      ),
                      id: "admin",
                      duration: 2000,
                    });
                  }}
                  className="ml-1 shrink-0 text-blue-500 dark:text-green-400"
                >
                  <ShieldCheck className="size-[clamp(1.25rem,6cqw,2rem)]" />
                </span>
              )}
            </h1>
            <p className="truncate text-[clamp(0.95rem,3.5cqw,1.125rem)] text-gray-600 dark:text-gray-400">
              @{user?.username}
            </p>
          </div>

          {user?.id === viewerId && (
            <Link
              href="/points"
              className="flex h-[clamp(3.25rem,14cqw,5rem)] w-[clamp(5rem,20cqw,6.5rem)] shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-neutral-100 px-3 text-[clamp(0.875rem,2.8cqw,1rem)] text-neutral-800 shadow-sm transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
            >
              <p className="truncate font-medium">Points</p>
            </Link>
          )}
        </div>

        {user?.bio && (
          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-xl">
            {user.bio}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 ">
          {[
            { label: "Posts", value: user?.postsCount },
            { label: "Likes", value: user?.likesCount },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-black/5 dark:border-white/10 p-4 flex flex-col items-center justify-center bg-black/5 dark:bg-white/3"
            >
              <span className="max-w-full truncate text-lg font-semibold">
                {item.value}
              </span>
              <span className="max-w-full truncate text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="bg-neutral-100 dark:bg-neutral-950 md:-mx-2"
      >
        <PostReel
          userId={user?.id}
          scrollContainerId={isPortal ? "portal-scroll-container" : undefined}
        />
      </section>

      {imageView && (
        <ImageViewer
          images={
            (imageView === "cover" &&
              (coverPreviewUrl ? coverPreviewUrl : user?.coverPic)) ||
            (imageView === "profile" &&
              (profilePreviewUrl ? profilePreviewUrl : user?.profilePic)) ||
            []
          }
          onClose={() => setImageView(null)}
        />
      )}

      {isEditOpen && isOwner && (
        <OverlayPortal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
              <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between gap-4 border-b border-black/5 bg-white/95 px-5 py-4 dark:border-white/10 dark:bg-neutral-900/95">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold text-black dark:text-white">
                    Edit Profile
                  </h2>
                  <p className="hidden truncate text-sm text-gray-600 dark:text-gray-400 md:block">
                    Update your photo, basic info, username, and password in one
                    place.
                  </p>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-full p-2 text-gray-600 transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:text-gray-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="shrink-0 border-b border-black/5 px-5 py-4 dark:border-white/10">
                <div className="flex gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-4">
                  {editTabs.map((tab) => {
                    const Icon = tab.icon;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveEditTab(tab.id)}
                        className={`flex min-w-0 flex-1 items-center justify-center rounded-2xl border px-3 py-3 text-sm font-semibold transition sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${activeEditTab === tab.id
                          ? "border-blue-400 bg-blue-400 text-white shadow-sm dark:border-black dark:bg-black dark:text-white"
                          : "border-black/5 bg-neutral-50 text-neutral-600 hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                          }`}
                      >
                        <span
                          className={`shrink-0 rounded-xl p-2 shadow-sm ${activeEditTab === tab.id
                            ? "bg-white/20 text-white dark:bg-neutral-900 dark:text-white"
                            : "bg-white text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                            }`}
                        >
                          <Icon size={16} />
                        </span>
                        <span className="hidden min-w-0 truncate sm:inline">
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-none overscroll-contain">
                {activeEditTab === "photo" && (
                  <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
                    <div className="flex min-w-0 items-center gap-2 px-5 pt-5 text-sm font-semibold text-black dark:text-white">
                      <ImageUp size={18} className="shrink-0" />
                      <span className="min-w-0 truncate">Profile Photos</span>
                    </div>
                    <div className="mt-4">
                      <div className="relative mb-14">
                        <div className="relative aspect-5/2 w-full overflow-hidden bg-gray-300 dark:bg-neutral-800">
                          {displayedCoverSrc ? (
                            coverPreviewUrl ? (
                              <Image
                                src={coverPreviewUrl}
                                fill
                                sizes="(min-width: 768px) 42rem, 100vw"
                                alt="Cover photo preview"
                                className="object-cover"
                              />
                            ) : (
                              <RecoverableImage
                                src={displayedCoverSrc}
                                fill
                                sizes="(min-width: 768px) 42rem, 100vw"
                                alt="Cover photo"
                                className="object-cover"
                                wrapperClassName="h-full w-full"
                                showRetryButton
                                retryButtonClassName="h-10 w-10"
                              />
                            )
                          ) : null}

                          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/35 opacity-0 transition hover:opacity-100 focus-within:opacity-100">
                            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/85 text-neutral-900 shadow-lg backdrop-blur dark:bg-black/70 dark:text-white">
                              <Camera size={22} />
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isCoverPending || isProfilePicPending}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (coverPreviewUrl) {
                                  URL.revokeObjectURL(coverPreviewUrl);
                                }
                                setSelectedCoverFile(file);
                                setCoverPreviewUrl(URL.createObjectURL(file));
                              }}
                            />
                          </label>
                        </div>

                        <div className="absolute left-1/10 z-10 w-3/14 min-w-22 -bottom-2/9">
                          <div className="relative overflow-hidden rounded-full">
                            <Image
                              src={displayedProfileSrc}
                              alt="Profile preview"
                              width={200}
                              height={200}
                              className="aspect-square w-full rounded-full border-[1vw] border-white bg-gray-300 object-cover dark:border-neutral-900 md:border-[0.6vw] lg:border-[clamp(5px,1vw,7px)]"
                            />
                            <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition hover:opacity-100 focus-within:opacity-100">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-neutral-900 shadow-lg backdrop-blur dark:bg-black/70 dark:text-white">
                                <Camera size={20} />
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isProfilePicPending || isCoverPending}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (profilePreviewUrl) {
                                    URL.revokeObjectURL(profilePreviewUrl);
                                  }
                                  setSelectedProfileFile(file);
                                  setProfilePreviewUrl(URL.createObjectURL(file));
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-5">
                        <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-neutral-50 p-3 dark:border-white/10 dark:bg-neutral-950 sm:flex-row sm:items-center sm:justify-between">
                          <p className="min-w-0 truncate text-sm text-neutral-500 dark:text-neutral-400">
                            {hasSelectedPhotoChanges
                              ? [
                                selectedProfileFile ? "profile picture" : null,
                                selectedCoverFile ? "cover photo" : null,
                              ].filter(Boolean).join(" and ") + " selected"
                              : "Choose a profile picture or cover photo to save."}
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:w-64">
                            <button
                              type="button"
                              disabled={!hasSelectedPhotoChanges || isPhotoSavePending}
                              onClick={saveSelectedPhotos}
                              className="inline-flex h-11 min-w-0 items-center justify-center rounded-2xl bg-blue-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:pointer-events-none disabled:opacity-45 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                            >
                              <span className="min-w-0 truncate">
                                {isPhotoSavePending ? "Saving..." : "Save"}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={!hasSelectedPhotoChanges || isPhotoSavePending}
                              onClick={cancelSelectedPhotos}
                              className="inline-flex h-11 min-w-0 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 disabled:pointer-events-none disabled:opacity-45 dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                            >
                              <span className="min-w-0 truncate">Cancel</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeEditTab === "basic" && (
                  <form
                    onSubmit={handleSubmitProfile(onSubmitProfile)}
                    className="mx-auto max-w-2xl rounded-3xl border border-black/10 bg-slate-100 p-5 dark:border-white/10 dark:bg-neutral-900"
                  >
                    <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-black dark:text-white">
                      <UserRoundCog size={18} className="shrink-0" />
                      <span className="min-w-0 truncate">Basic Info</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-gray-600 dark:text-gray-400">
                      Update your display name and bio.
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 border border-neutral-200 dark:bg-black dark:border-neutral-700 dark:text-neutral-300">
                      <Coins size={12} className="text-amber-500 dark:text-amber-400" />
                      <span>Name change: {GlobalSettings.nameChangeCost} points</span>
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input
                        {...registerProfile("name")}
                        placeholder="Name"
                        className="h-11 rounded-2xl border border-gray-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                      <textarea
                        {...registerProfile("bio")}
                        placeholder="Bio"
                        rows={4}
                        className="resize-none rounded-2xl border border-gray-300 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900 sm:col-span-2"
                      />
                    </div>
                    <button
                      disabled={isProfilePending}
                      className="mt-4 inline-flex h-11 max-w-full items-center rounded-2xl bg-blue-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                    >
                      <span className="min-w-0 truncate">
                        {isProfilePending ? "Saving..." : "Save Basic Info"}
                      </span>
                    </button>
                  </form>
                )}

                {activeEditTab === "username" && (
                  <form
                    onSubmit={handleSubmitUsername(onSubmitUsername)}
                    className="mx-auto max-w-2xl rounded-3xl border border-black/10 bg-slate-100 p-5 dark:border-white/10 dark:bg-neutral-900"
                  >
                    <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-black dark:text-white">
                      <AtSign size={18} className="shrink-0" />
                      <span className="min-w-0 truncate">Username</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-gray-600 dark:text-gray-400">
                      Change your username and keep your profile identity current.
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 border border-neutral-200 dark:bg-black dark:border-neutral-700 dark:text-neutral-300">
                      <Coins size={12} className="text-amber-500 dark:text-amber-400" />
                      <span>Username change: {GlobalSettings.usernameChangeCost} points</span>
                    </p>
                    <input
                      {...registerUsername("username")}
                      placeholder="Username"
                      className="mt-4 h-11 w-full rounded-2xl border border-gray-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <button
                      disabled={isUsernamePending}
                      className="mt-4 inline-flex h-11 max-w-full items-center rounded-2xl bg-blue-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                    >
                      <span className="min-w-0 truncate">
                        {isUsernamePending ? "Updating..." : "Update Username"}
                      </span>
                    </button>
                  </form>
                )}

                {activeEditTab === "password" && (
                  <form
                    onSubmit={handleSubmitPassword(onSubmitPassword)}
                    className="mx-auto max-w-2xl rounded-3xl border border-black/10 bg-slate-100 p-5 dark:border-white/10 dark:bg-neutral-900"
                  >
                    <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-black dark:text-white">
                      <KeyRound size={18} className="shrink-0" />
                      <span className="min-w-0 truncate">Password</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-gray-600 dark:text-gray-400">
                      {user?.hasPassword
                        ? "Update your password with your current credentials."
                        : "Add a password so you can log in with email later."}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {user?.hasPassword ? (
                        <input
                          type="password"
                          {...registerPassword("oldPassword")}
                          placeholder="Old password"
                          className="h-11 rounded-2xl border border-gray-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      ) : null}
                      <input
                        type="password"
                        {...registerPassword("newPassword")}
                        placeholder="New password"
                        className="h-11 rounded-2xl border border-gray-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                      <input
                        type="password"
                        {...registerPassword("confirmPassword")}
                        placeholder="Confirm password"
                        className="h-11 rounded-2xl border border-gray-300 bg-white px-3 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </div>
                    <button
                      disabled={isPasswordPending}
                      className="mt-4 inline-flex h-11 max-w-full items-center rounded-2xl bg-blue-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                    >
                      <span className="min-w-0 truncate">
                        {isPasswordPending
                          ? user?.hasPassword
                            ? "Changing..."
                            : "Adding..."
                          : user?.hasPassword
                            ? "Change Password"
                            : "Add Password"}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}

      {isThoughtOpen && isOwner && (
        <OverlayPortal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
              <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4 dark:border-white/10">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-black dark:text-white">
                    Share a Thought
                  </h2>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 border border-neutral-200 dark:bg-black dark:border-neutral-700 dark:text-neutral-300">
                    <Coins size={12} className="text-amber-500 dark:text-amber-400" />
                    <span>{GlobalSettings.thoughtCreationCost} points to post</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsThoughtOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                  aria-label="Close thought editor"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5">
                <textarea
                  value={thoughtText}
                  onChange={(event) => setThoughtText(event.target.value)}
                  maxLength={280}
                  placeholder={activeThought?.text || "What's on your mind?"}
                  className="h-36 w-full resize-none rounded-2xl border border-black/10 bg-neutral-50 p-4 text-sm outline-none transition focus:border-blue-400 dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="truncate">
                    {activeThought ? "Posting replaces your current thought." : "Visible from your profile."}
                  </span>
                  <span className="shrink-0">{thoughtText.length}/280</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={!activeThought || !canManageThought || deleteThoughtMutation.isPending}
                    onClick={() => activeThought && deleteThoughtMutation.mutate(activeThought.id)}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-500/20 dark:bg-neutral-900 dark:hover:bg-red-950/30"
                  >
                    {deleteThoughtMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    disabled={!thoughtText.trim() || createThoughtMutation.isPending}
                    onClick={() => createThoughtMutation.mutate(thoughtText.trim())}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                  >
                    {createThoughtMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}

      {isViewsOpen && isOwner && (
        <OverlayPortal>
          <div className="fixed inset-0 z-[120] flex items-end bg-black/40 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-4">
            <div className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900 md:rounded-3xl">
              <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-black/5 px-5 dark:border-white/10">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-black dark:text-white">
                    Profile Views
                  </h2>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    Recent people who opened your profile
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewsOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                  aria-label="Close profile views"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-64 overflow-y-auto p-4 scrollbar-none overscroll-contain">
                {profileViewsQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500">
                    <Loader2 size={16} className="animate-spin" />
                    Loading views...
                  </div>
                ) : profileViewsQuery.isError ? (
                  <div className="flex min-h-64 items-center justify-center text-center text-sm text-red-500">
                    {(profileViewsQuery.error as Error).message}
                  </div>
                ) : profileViews.length ? (
                  <div className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-neutral-50 dark:divide-white/10 dark:border-white/10 dark:bg-neutral-950">
                    {profileViews.map((view) => (
                      <Link
                        key={view.id}
                        href={view.user?.username ? `/users/${view.user.username}` : "#"}
                        onClick={() => setIsViewsOpen(false)}
                        className="flex min-w-0 items-center gap-3 px-3 py-3 transition hover:bg-blue-50 dark:hover:bg-neutral-900"
                      >
                        <RecoverableImage
                          src={view.user?.profilePic || "/default-avatar.png"}
                          alt={view.user?.name || "Profile viewer"}
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-full object-cover"
                          wrapperClassName="h-11 w-11 shrink-0 rounded-full"
                          fallbackSrc="/default-avatar.png"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {view.user?.name || "Unknown user"}
                          </span>
                          <span className="block truncate text-xs text-neutral-500">
                            {new Date(view.createdAt).toLocaleString()}
                          </span>
                        </span>
                      </Link>
                    ))}
                    <div ref={profileViewsSentinelRef} className="h-2" />
                    {profileViewsQuery.isFetchingNextPage && (
                      <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-neutral-500">
                        <Loader2 size={16} className="animate-spin" />
                        Loading more...
                      </div>
                    )}
                    {!profileViewsQuery.hasNextPage && (
                      <div className="px-3 py-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
                        You are all caught up.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-64 items-center justify-center text-center text-sm text-neutral-500">
                    No profile views yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}
    </main>
  );
};

export default Profile;
