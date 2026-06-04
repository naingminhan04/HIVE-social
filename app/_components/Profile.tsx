"use client";

import {
  getUserByUsernameAction,
  checkUniqueUsernameAction,
  updateUsernameAction,
  updateCoverPicAction,
  updateProfilePicAction,
  updateProfileAction,
  changePasswordAction,
} from "../_actions/user";
import { uploadFiles } from "@/utils/uploadUtils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ShieldCheck,
  PencilLine,
  X,
  Camera,
  Check,
  Loader2,
  UserRoundCog,
  KeyRound,
  AtSign,
  ImageUp,
  MessageCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SubmitHandler, useForm } from "react-hook-form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import PostReel from "./PostReel";
import { useEffect, useState } from "react";
import ImageViewer from "./ImageViewer";
import DummyProfile from "./DummyProfile";
import PointsModal from "./PointsModal";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import OverlayPortal from "./OverlayPortal";
import RecoverableImage from "./RecoverableImage";

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
  const viewer = useAuthStore((state) => state.user);
  const setViewer = useAuthStore((state) => state.setUser);
  const viewerId = viewer?.id;
  const normalizedUsername = username.trim();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPointsOpen, setIsPointsOpen] = useState(false);
  const [editCover, setEditCover] = useState(false);
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
  const [activeEditTab, setActiveEditTab] = useState<EditProfileTab>("photo");

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

  useLockBodyScroll(isEditOpen);

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
      setEditCover(false);
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

  if (isLoading) return <DummyProfile isPortal={isPortal} />;
  if (error) {
    return (
      <div className="flex justify-center items-center lg:h-dvh h-[calc(100dvh-60px)]">
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
  const openMessage = () => {
    if (!user?.id) return;

    const params = new URLSearchParams({
      userId: user.id,
      name: user.name ?? "New chat",
      username: user.username ?? user.id,
    });

    if (user.profilePic) {
      params.set("profilePic", user.profilePic);
    }

    router.push(`/chat?${params.toString()}`);
  };

  return (
    <main
      className={`@container/profile bg-white relative text-sm sm:text-base dark:bg-neutral-900 ${
        isPortal ? "min-h-full" : "lg:min-h-dvh min-h-[calc(100dvh-60px)]"
      }`}
    >
      <div
        className={`z-30 flex h-14 w-full justify-between bg-white/95 font-semibold backdrop-blur dark:bg-neutral-900/95 ${
          isPortal
            ? "sticky top-0 items-center border-b border-black/5 px-3 dark:border-white/10"
            : "sticky top-15 items-center border-b border-black/5 px-3 dark:border-white/10 lg:top-0"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!isPortal && (
            <button
              onClick={() => router.back()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="truncate text-lg text-neutral-950 dark:text-neutral-50">
            {isPortal ? "Your Profile" : `${user?.name}'s Profile`}
          </span>
        </div>

        {isOwner ? (
          <button
            onClick={() => setIsEditOpen(true)}
            className="ml-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-300 bg-blue-300 text-sm text-neutral-950 shadow-sm transition hover:bg-blue-400 hover:text-white active:bg-blue-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black sm:w-auto sm:gap-2 sm:px-4"
            aria-label="Edit profile"
          >
            <PencilLine size={16} />
            <span className="hidden text-sm font-medium sm:inline">Edit Profile</span>
          </button>
        ) : user?.id ? (
          <button
            onClick={openMessage}
            className="ml-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-300 bg-blue-300 text-sm text-neutral-950 shadow-sm transition hover:bg-blue-400 hover:text-white active:bg-blue-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black sm:w-auto sm:gap-2 sm:px-4"
            aria-label={`Message ${user.name}`}
          >
            <MessageCircle size={16} />
            <span className="hidden text-sm font-medium sm:inline">Message</span>
          </button>
        ) : null}
      </div>

      <div className="relative mb-[10vw] md:mb-[6vw] lg:mb-[clamp(10px,5vw,60px)]">
        <div className="w-full aspect-5/2 relative bg-gray-300">
          {coverPreviewUrl ? (
            <Image
              src={coverPreviewUrl}
              onClick={() => setImageView("cover")}
              fill
              alt="Cover photo preview"
              className="object-cover"
            />
          ) : (
            user?.coverPic && (
              <RecoverableImage
                src={user.coverPic}
                onClick={() => setImageView("cover")}
                fill
                alt="Cover photo"
                className="object-cover"
                wrapperClassName="h-full w-full"
                showRetryButton
                retryButtonClassName="h-10 w-10"
              />
            )
          )}

          {isOwner &&
            (editCover ? (
              <div className="absolute right-2 bottom-2 flex gap-2">
                <button
                  disabled={isCoverPending}
                  className="backdrop-blur-sm p-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg"
                  onClick={saveCoverPicture}
                >
                  {isCoverPending ? <Loader2 className="animate-spin" /> : <Check />}
                </button>
                <button
                  disabled={isCoverPending}
                  className="backdrop-blur-sm p-2 bg-gray-400 hover:bg-gray-300 dark:bg-neutral-600 dark:hover:bg-neutral-700 rounded-lg disabled:opacity-50"
                  onClick={() => {
                    setEditCover(false);
                    setSelectedCoverFile(null);
                    if (coverPreviewUrl) {
                      URL.revokeObjectURL(coverPreviewUrl);
                      setCoverPreviewUrl(null);
                    }
                  }}
                >
                  <X />
                </button>
              </div>
            ) : (
              <label
                htmlFor="coverPic"
                className="absolute right-2 bottom-2 p-2 backdrop-blur-md bg-white/60 dark:bg-black/60 cursor-pointer rounded-lg"
              >
                <Camera />
                <input
                  disabled={isCoverPending || isProfilePicPending}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedCoverFile(file);
                      const url = URL.createObjectURL(file);
                      setCoverPreviewUrl(url);
                      setEditCover(true);
                    }
                  }}
                  id="coverPic"
                  className="hidden"
                />
              </label>
            ))}
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
            className="object-cover border-[1vw] md:border-[0.6vw] lg:border-[clamp(5px,1vw,7px)] border-white dark:border-neutral-900 bg-gray-300 w-full aspect-square relative rounded-full"
            wrapperClassName="w-full aspect-square rounded-full"
            fallbackSrc="/default-avatar.png"
            showRetryButton
            retryButtonClassName="h-9 w-9"
            onClick={() =>
              (user?.profilePic || profilePreviewUrl) && setImageView("profile")
            }
          />

          <span className="absolute bottom-1/10 right-1/10 border w-[3vw] md:w-[1.8vw] lg:w-[clamp(17px,3vw,1px)] aspect-square bg-green-500 rounded-full"></span>
        </div>
      </div>

      <section className="px-4 pb-5 space-y-6">
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
            <button
              onClick={() => setIsPointsOpen(true)}
              className="flex h-[clamp(3.25rem,14cqw,5rem)] w-[clamp(5rem,20cqw,6.5rem)] shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-neutral-100 px-3 text-[clamp(0.875rem,2.8cqw,1rem)] text-neutral-800 shadow-sm transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
            >
              <p className="truncate font-medium">Points</p>
            </button>
          )}
        </div>

        {user?.bio && (
          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-xl">
            {user.bio}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
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

      <PointsModal
        isOpen={isPointsOpen}
        onClose={() => setIsPointsOpen(false)}
        currentUserPoints={user?.points ?? viewer?.points ?? 0}
        onPointsUpdated={(points) => {
          if (viewer && viewer.points !== points) {
            setViewer({ ...viewer, points });
          }
        }}
      />

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
                        className={`flex min-w-0 flex-1 items-center justify-center rounded-2xl border px-3 py-3 text-sm font-semibold transition sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${
                          activeEditTab === tab.id
                            ? "border-blue-400 bg-blue-400 text-white shadow-sm dark:border-black dark:bg-black dark:text-white"
                            : "border-black/5 bg-neutral-50 text-neutral-600 hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                        }`}
                      >
                        <span
                          className={`shrink-0 rounded-xl p-2 shadow-sm ${
                            activeEditTab === tab.id
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
                                alt="Cover photo preview"
                                className="object-cover"
                              />
                            ) : (
                              <RecoverableImage
                                src={displayedCoverSrc}
                                fill
                                alt="Cover photo"
                                className="object-cover"
                                wrapperClassName="h-full w-full"
                                showRetryButton
                                retryButtonClassName="h-10 w-10"
                              />
                            )
                          ) : null}

                          <label className="absolute bottom-2 right-2 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-white/70 p-2 text-neutral-900 backdrop-blur-md transition hover:bg-white dark:bg-black/60 dark:text-white dark:hover:bg-black/75">
                            <Camera size={18} />
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
                                setEditCover(true);
                              }}
                            />
                          </label>
                        </div>

                        <div className="absolute left-1/10 z-10 w-3/14 min-w-22 -bottom-2/9">
                          <Image
                            src={displayedProfileSrc}
                            alt="Profile preview"
                            width={200}
                            height={200}
                            className="aspect-square w-full rounded-full border-[1vw] border-white bg-gray-300 object-cover dark:border-neutral-900 md:border-[0.6vw] lg:border-[clamp(5px,1vw,7px)]"
                          />
                          <span className="absolute bottom-1/10 right-1/10 aspect-square w-4 rounded-full border bg-green-500 sm:w-5" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 px-4 pb-5">
                        <label className="inline-flex h-11 min-w-0 max-w-full cursor-pointer items-center rounded-2xl bg-blue-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black">
                          <span className="min-w-0 truncate">Choose Photo</span>
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

                        {selectedProfileFile && (
                          <>
                            <button
                              type="button"
                              disabled={isProfilePicPending}
                              onClick={saveProfilePicture}
                              className="inline-flex h-11 min-w-0 max-w-full items-center rounded-2xl bg-blue-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                            >
                              <span className="min-w-0 truncate">
                                {isProfilePicPending ? "Updating..." : "Update Photo"}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={isProfilePicPending}
                              onClick={() => {
                                setSelectedProfileFile(null);
                                if (profilePreviewUrl) {
                                  URL.revokeObjectURL(profilePreviewUrl);
                                  setProfilePreviewUrl(null);
                                }
                              }}
                              className="inline-flex h-11 min-w-0 max-w-full items-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 disabled:opacity-50 dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                            >
                              <span className="min-w-0 truncate">Cancel</span>
                            </button>
                          </>
                        )}

                        {selectedCoverFile && (
                          <>
                            <button
                              type="button"
                              disabled={isCoverPending}
                              onClick={saveCoverPicture}
                              className="inline-flex h-11 min-w-0 max-w-full items-center rounded-2xl bg-blue-300 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-blue-400 hover:text-white active:bg-blue-500 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                            >
                              <span className="min-w-0 truncate">
                                {isCoverPending ? "Updating..." : "Update Banner"}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={isCoverPending}
                              onClick={() => {
                                setEditCover(false);
                                setSelectedCoverFile(null);
                                if (coverPreviewUrl) {
                                  URL.revokeObjectURL(coverPreviewUrl);
                                  setCoverPreviewUrl(null);
                                }
                              }}
                              className="inline-flex h-11 min-w-0 max-w-full items-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 disabled:opacity-50 dark:border-white/10 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                            >
                              <span className="min-w-0 truncate">Cancel Banner</span>
                            </button>
                          </>
                        )}
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
    </main>
  );
};

export default Profile;
