import React from "react";
import OverlayPortal from "../layout/OverlayPortal";
import RecoverableImage from "../common/RecoverableImage";
import { X, Search, Plus, Loader2 } from "lucide-react";
import type { SearchUserType } from "@/types/search";
import type { ComposeMode } from "@/types/chat";

type ComposeModalProps = {
  composeMode: ComposeMode;
  onClose: () => void;
  // Private chat props
  privateSearch: string;
  setPrivateSearch: (val: string) => void;
  privateSearchLoading: boolean;
  privateSearchResults: SearchUserType[];
  openPrivateDraft: (user: SearchUserType) => void;
  // Group chat props
  groupName: string;
  setGroupName: (val: string) => void;
  groupSearch: string;
  setGroupSearch: (val: string) => void;
  groupSearchLoading: boolean;
  groupSearchResults: SearchUserType[];
  groupUsers: SearchUserType[];
  toggleGroupUser: (user: SearchUserType) => void;
  isCreatingGroup: boolean;
  onCreateGroup: () => void;
};

export function ComposeModal({
  composeMode,
  onClose,
  privateSearch,
  setPrivateSearch,
  privateSearchLoading,
  privateSearchResults,
  openPrivateDraft,
  groupName,
  setGroupName,
  groupSearch,
  setGroupSearch,
  groupSearchLoading,
  groupSearchResults,
  groupUsers,
  toggleGroupUser,
  isCreatingGroup,
  onCreateGroup,
}: ComposeModalProps) {
  const selectedUserIds = React.useMemo(
    () => new Set(groupUsers.map((u) => u.id)),
    [groupUsers]
  );

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-130 flex items-end bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
        <div className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-950">
          <div className="flex h-14 items-center justify-between border-b border-black/5 px-4 dark:border-white/10">
            <h2 className="font-semibold">{composeMode === "private" ? "New Chat" : "New Group"}</h2>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[calc(85dvh-56px)] overflow-y-auto p-4 scrollbar-none">
            {composeMode === "private" ? (
              <>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-neutral-900">
                  <Search size={17} className="text-neutral-400" />
                  <input value={privateSearch} onChange={(e) => setPrivateSearch(e.target.value)} placeholder="Search people" className="min-w-0 flex-1 bg-transparent text-base outline-none" style={{ fontSize: 16 }} />
                </div>
                <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                  {privateSearchLoading ? (
                    <p className="py-6 text-center text-sm text-neutral-400">Searching...</p>
                  ) : privateSearch.trim().length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-400">Start typing to search people.</p>
                  ) : privateSearchResults.length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-400">No users found.</p>
                  ) : (
                    privateSearchResults.map((user) => (
                      <button key={user.id} type="button" onClick={() => openPrivateDraft(user)} className="flex w-full min-w-0 items-center gap-3 py-3 text-left">
                        <RecoverableImage src={user.profilePic || "/default-avatar.png"} alt={user.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" wrapperClassName="h-11 w-11 shrink-0 rounded-full" fallbackSrc="/default-avatar.png" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{user.name}</span>
                          <span className="block truncate text-sm text-neutral-400">@{user.username}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="h-11 w-full rounded-xl border border-black/10 bg-neutral-50 px-3 text-base outline-none focus:border-blue-400 dark:border-white/10 dark:bg-neutral-900" style={{ fontSize: 16 }} />
                {groupUsers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {groupUsers.map((user) => (
                      <button key={user.id} type="button" onClick={() => toggleGroupUser(user)} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-neutral-900 dark:text-neutral-100">
                        <span className="truncate">{user.name}</span>
                        <X size={12} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-neutral-900">
                  <Search size={17} className="text-neutral-400" />
                  <input value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder="Add people" className="min-w-0 flex-1 bg-transparent text-base outline-none" style={{ fontSize: 16 }} />
                </div>
                <div className="mt-3 divide-y divide-black/5 dark:divide-white/10">
                  {groupSearch.trim().length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-400">Start typing to add people.</p>
                  ) : groupSearchLoading ? (
                    <p className="py-6 text-center text-sm text-neutral-400">Searching...</p>
                  ) : groupSearchResults.length === 0 ? (
                    <p className="py-6 text-center text-sm text-neutral-400">No users found.</p>
                  ) : (
                    groupSearchResults.map((user) => (
                      <button key={user.id} type="button" onClick={() => toggleGroupUser(user)} className="flex w-full min-w-0 items-center gap-3 py-3 text-left">
                        <RecoverableImage src={user.profilePic || "/default-avatar.png"} alt={user.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" wrapperClassName="h-11 w-11 shrink-0 rounded-full" fallbackSrc="/default-avatar.png" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{user.name}</span>
                          <span className="block truncate text-sm text-neutral-400">@{user.username}</span>
                        </span>
                        <span className={`h-5 w-5 rounded-full border ${selectedUserIds.has(user.id) ? "border-blue-400 bg-blue-400" : "border-neutral-300 dark:border-neutral-600"}`} />
                      </button>
                    ))
                  )}
                </div>
                <button type="button" disabled={isCreatingGroup} onClick={onCreateGroup} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-400 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 dark:bg-white dark:text-black">
                  {isCreatingGroup ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                  <span>Create Group</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
