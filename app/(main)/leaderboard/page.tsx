"use client";

import {
  getPointsLeaderboardAction,
  getPopularUsersAction,
  getUsageLeaderboardAction,
} from "@/app/_actions/user";
import RecoverableImage from "@/app/_components/common/RecoverableImage";
import type {
  LeaderboardUser,
  PointsLeaderboardUser,
  PopularLeaderboardUser,
  UsageLeaderboardUser,
} from "@/types/leaderboard";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  Clock3,
  Eye,
  Flame,
  Heart,
  Medal,
  MessageCircleHeart,
  Search,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { useEffect, useMemo, useState } from "react";

type LeaderboardTab = "points" | "popular" | "usage";

const PAGE_SIZE = 10;

const tabs: {
  id: LeaderboardTab;
  label: string;
  description: string;
  icon: typeof Trophy;
}[] = [
  { id: "points", label: "Points", description: "Rank balance", icon: Trophy },
  { id: "popular", label: "Popular", description: "Engagement", icon: Flame },
  { id: "usage", label: "Usage", description: "Daily time", icon: Clock3 },
];

const getTodayInputValue = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const formatCount = (value: number) =>
  new Intl.NumberFormat("en", { notation: value >= 10000 ? "compact" : "standard" }).format(value);

const formatUsageTime = (milliseconds: number, fallback: string) => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return fallback || "0 min";
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  return `${hours} hr ${minutes} min`;
};

const profileHref = (user: LeaderboardUser) =>
  `/users/${encodeURIComponent(user.username)}`;

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank <= 3) {
    const styles = {
      1: "bg-yellow-100 text-yellow-700 ring-yellow-300 dark:bg-yellow-400/15 dark:text-yellow-300 dark:ring-yellow-400/30",
      2: "bg-neutral-200 text-neutral-700 ring-neutral-300 dark:bg-neutral-400/15 dark:text-neutral-200 dark:ring-neutral-400/30",
      3: "bg-orange-100 text-orange-700 ring-orange-300 dark:bg-orange-400/15 dark:text-orange-300 dark:ring-orange-400/30",
    }[rank];

    return (
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ${styles}`}>
        <Medal size={18} />
      </span>
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      {rank}
    </span>
  );
};

const UserAvatar = ({ user, size = 44 }: { user: LeaderboardUser; size?: number }) => (
  <RecoverableImage
    src={user.profilePic || "/default-avatar.png"}
    alt={user.name}
    width={size}
    height={size}
    className="h-full w-full rounded-full object-cover"
    wrapperClassName="h-11 w-11 shrink-0 rounded-full"
    fallbackSrc="/default-avatar.png"
    userId={user.id}
    showOnlineStatus
    onlineStatusSize="sm"
  />
);

const SkeletonBlock = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-md bg-neutral-200/80 dark:bg-neutral-800 ${className}`} />
);

const PointsSkeleton = () => (
  <div className="space-y-2">
    <section className="rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-9 w-9 rounded-full" />
        <SkeletonBlock className="h-11 w-11 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-24" />
        </div>
        <div className="shrink-0 space-y-2 text-right">
          <SkeletonBlock className="ml-auto h-4 w-12" />
          <SkeletonBlock className="ml-auto h-3 w-10" />
        </div>
      </div>
    </section>

    <section className="space-y-1.5">
      <div className="px-1.5 py-1 space-y-2">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-3 w-28" />
      </div>
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border-2 border-white bg-white p-3 dark:border-neutral-900 dark:bg-neutral-900"
        >
          <SkeletonBlock className="h-9 w-9 rounded-full" />
          <SkeletonBlock className="h-11 w-11 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-36 max-w-full" />
            <SkeletonBlock className="h-3 w-24 max-w-full" />
          </div>
          <div className="shrink-0 space-y-2 text-right">
            <SkeletonBlock className="ml-auto h-4 w-14" />
            <SkeletonBlock className="ml-auto h-3 w-10" />
          </div>
        </div>
      ))}
    </section>
  </div>
);

const PopularRowSkeleton = () => (
  <div className="rounded-xl border-2 border-white bg-white p-3 dark:border-neutral-900 dark:bg-neutral-900">
    <div className="flex items-center gap-3">
      <SkeletonBlock className="h-9 w-9 rounded-full" />
      <SkeletonBlock className="h-11 w-11 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-32 max-w-full" />
        <SkeletonBlock className="h-3 w-24 max-w-full" />
      </div>
      <div className="shrink-0 space-y-2 text-right">
        <SkeletonBlock className="ml-auto h-4 w-16" />
        <SkeletonBlock className="ml-auto h-3 w-14" />
      </div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-950"
        >
          <SkeletonBlock className="h-3.5 w-3.5 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-12" />
            <SkeletonBlock className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PopularSkeleton = () => (
  <div className="space-y-2">
    <section className="space-y-1.5">
      <div className="px-1.5 py-1 space-y-2">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-3 w-24" />
      </div>
      {Array.from({ length: 10 }).map((_, index) => (
        <PopularRowSkeleton key={index} />
      ))}
    </section>
  </div>
);

const UsageControlsSkeleton = () => (
  <section className="rounded-xl border-2 border-white bg-white p-3 dark:border-neutral-900 dark:bg-neutral-900">
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-neutral-950">
        <SkeletonBlock className="h-4 w-4 rounded-full" />
        <SkeletonBlock className="h-4 w-32" />
      </div>
      <div className="flex h-11 items-center rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-neutral-950">
        <SkeletonBlock className="h-4 w-20" />
      </div>
    </div>
    <div className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 dark:border-white/10 dark:bg-neutral-950">
      <SkeletonBlock className="h-4 w-4 rounded-full" />
      <SkeletonBlock className="h-4 w-40" />
    </div>
  </section>
);

const UsageRowSkeleton = () => (
  <div className="flex items-center gap-3 rounded-xl border-2 border-white bg-white p-3 dark:border-neutral-900 dark:bg-neutral-900">
    <SkeletonBlock className="h-9 w-9 rounded-full" />
    <SkeletonBlock className="h-11 w-11 rounded-full" />
    <div className="min-w-0 flex-1 space-y-2">
      <SkeletonBlock className="h-4 w-32 max-w-full" />
      <SkeletonBlock className="h-3 w-24 max-w-full" />
    </div>
    <div className="shrink-0 space-y-2 text-right">
      <SkeletonBlock className="ml-auto h-4 w-16" />
      <SkeletonBlock className="ml-auto h-3 w-10" />
    </div>
  </div>
);

const UsageSkeleton = () => (
  <div className="space-y-2">
    <UsageControlsSkeleton />
    <section className="space-y-1.5">
      <div className="px-1.5 py-1 space-y-2">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-3 w-28" />
      </div>
      {Array.from({ length: 10 }).map((_, index) => (
        <UsageRowSkeleton key={index} />
      ))}
    </section>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="rounded-xl border-2 border-white bg-white p-4 text-sm text-red-600 dark:border-neutral-900 dark:bg-neutral-900 dark:text-red-400">
    {message}
  </div>
);

const EmptyState = ({ icon: Icon, title, text }: {
  icon: typeof Trophy;
  title: string;
  text: string;
}) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-white bg-white px-6 py-14 text-center dark:border-neutral-900 dark:bg-neutral-900">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-500/10 dark:text-blue-300">
      <Icon size={24} />
    </div>
    <div>
      <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
        {title}
      </p>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {text}
      </p>
    </div>
  </div>
);

const PointsRow = ({ user }: { user: PointsLeaderboardUser }) => (
  <Link
    href={profileHref(user)}
    className="flex min-w-0 items-center gap-3 rounded-xl border-2 border-white bg-white p-3 transition hover:bg-blue-50 dark:border-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800"
  >
    <RankBadge rank={user.rank} />
    <UserAvatar user={user} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
        {user.name}
      </p>
      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
        @{user.username}
      </p>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
        {formatCount(user.points)}
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">points</p>
    </div>
  </Link>
);

const PointsTab = ({ users, me }: {
  users: PointsLeaderboardUser[];
  me: PointsLeaderboardUser;
}) => (
  <div className="space-y-2">
    <section className="rounded-xl border-2 border-white bg-white p-4 dark:border-neutral-900 dark:bg-neutral-900">
      <div className="flex min-w-0 items-center gap-3">
        <RankBadge rank={me.rank} />
        <UserAvatar user={me} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-normal text-neutral-500 dark:text-neutral-400">
            Your rank
          </p>
          <p className="truncate text-base font-bold text-neutral-950 dark:text-neutral-50">
            {me.name}
          </p>
          <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
            @{me.username}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
            {formatCount(me.points)}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">points</p>
        </div>
      </div>
    </section>

    <section className="space-y-1.5">
      <div className="px-1.5 py-1">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
          Points leaderboard
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Top 10 by current point balance
        </p>
      </div>
      {users.length ? (
        users.map((user) => <PointsRow key={user.id} user={user} />)
      ) : (
        <EmptyState icon={Trophy} title="No points yet" text="The leaderboard will fill up as users earn points." />
      )}
    </section>
  </div>
);

const PointsTabSkeleton = () => <PointsSkeleton />;

const PopularMetric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: number;
}) => (
  <div className="flex min-w-0 items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-2 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
    <Icon size={14} className="shrink-0 text-neutral-400 dark:text-neutral-500" />
    <div className="min-w-0">
      <p className="text-xs font-bold leading-none text-neutral-900 dark:text-neutral-50">
        {formatCount(value)}
      </p>
      <p className="mt-1 truncate text-[11px] leading-none text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
    </div>
  </div>
);

const PopularRow = ({ user, rank }: { user: PopularLeaderboardUser; rank: number }) => {
  const stats = [
    { label: "Likes", value: user.postLikes, icon: Heart },
    { label: "Profile views", value: user.profileViews, icon: UserRound },
    { label: "Posts", value: user.postsCount, icon: MessageCircleHeart },
    { label: "Post views", value: user.postViews, icon: Eye },
  ];

  return (
    <Link
      href={profileHref(user)}
      className="block rounded-xl border-2 border-white bg-white p-3 transition hover:bg-blue-50 dark:border-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800"
    >
      <div className="flex min-w-0 items-center gap-3">
        <RankBadge rank={rank} />
        <UserAvatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {user.name}
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            @{user.username}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-black/5 bg-neutral-100 px-3 py-2 text-right text-neutral-900 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-50">
          <p className="text-base font-bold leading-none">
            {formatCount(user.score)}
          </p>
          <p className="mt-1 text-[11px] leading-none text-neutral-500 dark:text-neutral-400">
            total score
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {stats.map((stat) => (
          <PopularMetric
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>
    </Link>
  );
};

const PopularTab = ({ users }: { users: PopularLeaderboardUser[] }) => (
  <div className="space-y-2">
    <section className="space-y-1.5">
      <div className="px-1.5 py-1">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
          Popular users
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Engagement rank
        </p>
      </div>
      {users.length ? (
        users.map((user, index) => (
          <PopularRow key={user.id} user={user} rank={index + 1} />
        ))
      ) : (
        <EmptyState icon={Flame} title="No popular users yet" text="Engagement stats will appear here when users interact." />
      )}
    </section>
  </div>
);

const PopularTabSkeleton = () => <PopularSkeleton />;

const UsageRow = ({ item, rank }: { item: UsageLeaderboardUser; rank: number }) => {
  const usedFor = formatUsageTime(
    item.summary.totalUsageTimeMs,
    item.summary.totalUsageTimeText,
  );

  return (
    <Link
      href={profileHref(item.user)}
      className="flex min-w-0 items-center gap-3 rounded-xl border-2 border-white bg-white p-3 transition hover:bg-blue-50 dark:border-neutral-900 dark:bg-neutral-900 dark:hover:bg-neutral-800"
    >
      <RankBadge rank={rank} />
      <UserAvatar user={item.user} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {item.user.name}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          @{item.user.username}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
          {usedFor}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">used</p>
      </div>
    </Link>
  );
};

const UsageControls = ({
  totalUsers,
  selectedDate,
  search,
  onDateChange,
  onSearchChange,
}: {
  totalUsers: number;
  selectedDate: string;
  search: string;
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}) => (
  <section className="rounded-xl border-2 border-white bg-white p-3 dark:border-neutral-900 dark:bg-neutral-900">
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 text-sm text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200">
        <CalendarDays size={17} className="shrink-0 text-neutral-400" />
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent outline-none"
          aria-label="Select usage date"
        />
      </label>
      <div className="flex h-11 items-center rounded-xl border border-black/10 bg-neutral-50 px-3 text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200">
        <span className="text-sm font-bold">{formatCount(totalUsers)} users</span>
      </div>
    </div>
    <label className="mt-2 flex h-11 min-w-0 items-center gap-2 rounded-xl border border-black/10 bg-neutral-50 px-3 text-sm text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200">
      <Search size={17} className="shrink-0 text-neutral-400" />
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search name or username"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-400"
        aria-label="Search usage leaderboard"
      />
    </label>
  </section>
);

const UsageTabBody = ({
  users,
  totalUsers,
  selectedDate,
  search,
  onDateChange,
  onSearchChange,
  loading,
  rankMap,
}: {
  users: UsageLeaderboardUser[];
  totalUsers: number;
  selectedDate: string;
  search: string;
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  loading: boolean;
  rankMap: Map<string, number>;
}) => (
  <div className="space-y-2">
    <UsageControls
      totalUsers={totalUsers}
      selectedDate={selectedDate}
      search={search}
      onDateChange={onDateChange}
      onSearchChange={onSearchChange}
    />

    <section className="space-y-1.5">
      <div className="px-1.5 py-1">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
          Usage leaderboard
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Selected day
        </p>
      </div>
      {loading ? (
        Array.from({ length: PAGE_SIZE }).map((_, index) => (
          <UsageRowSkeleton key={index} />
        ))
      ) : users.length ? (
        users.map((item, index) => (
          <UsageRow
            key={item.user.id}
            item={item}
            rank={rankMap.get(item.user.id) ?? index + 1}
          />
        ))
      ) : (
        <EmptyState icon={Clock3} title="No usage found" text="Try another date or search term." />
      )}
    </section>
  </div>
);
const LeaderboardPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("points");
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const [usageSearch, setUsageSearch] = useState("");
  const [debouncedUsageSearch, setDebouncedUsageSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedUsageSearch(usageSearch.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [usageSearch]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const pointsQuery = useQuery({
    queryKey: ["leaderboard", "points"],
    queryFn: async () => {
      const result = await getPointsLeaderboardAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 1000 * 60,
    retry: false,
  });

  const popularQuery = useQuery({
    queryKey: ["leaderboard", "popular"],
    queryFn: async () => {
      const result = await getPopularUsersAction();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: activeTab === "popular",
    staleTime: 1000 * 60,
    retry: false,
  });

  const usageRankQuery = useQuery({
    queryKey: ["leaderboard", "usage-ranks", selectedDate],
    queryFn: async () => {
      const allUsers: UsageLeaderboardUser[] = [];
      let page = 1;
      let nextPage: number | null = 1;

      while (nextPage) {
        const result = await getUsageLeaderboardAction({
          date: selectedDate,
          page,
          size: PAGE_SIZE,
        });

        if (!result.success) throw new Error(result.error);

        allUsers.push(...result.data.users);
        nextPage = result.data.metadata?.nextPage ?? null;
        page = nextPage ?? page + 1;
      }

      return allUsers;
    },
    enabled: activeTab === "usage" && !!selectedDate,
    staleTime: 1000 * 60,
    retry: false,
  });

  const usageQuery = useQuery({
    queryKey: ["leaderboard", "usage", selectedDate, debouncedUsageSearch],
    queryFn: async () => {
      const result = await getUsageLeaderboardAction({
        date: selectedDate,
        page: 1,
        size: PAGE_SIZE,
        name: debouncedUsageSearch,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: activeTab === "usage" && !!selectedDate,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: false,
  });

  const usageRankMap = useMemo(() => {
    const map = new Map<string, number>();
    usageRankQuery.data?.forEach((item, index) => {
      map.set(item.user.id, index + 1);
    });
    return map;
  }, [usageRankQuery.data]);

  const usageTotal = useMemo(() => {
    const metadata = usageQuery.data?.metadata;
    return metadata?.total ?? metadata?.totalElements ?? usageQuery.data?.users.length ?? 0;
  }, [usageQuery.data]);

  const renderActiveTab = () => {
    if (activeTab === "points") {
      if (pointsQuery.isLoading) return <PointsTabSkeleton />;
      if (pointsQuery.error) return <ErrorState message={(pointsQuery.error as Error).message} />;
      if (!pointsQuery.data) {
        return <EmptyState icon={Trophy} title="No points data" text="Points leaderboard data is unavailable." />;
      }
      return <PointsTab users={pointsQuery.data.users} me={pointsQuery.data.me} />;
    }

    if (activeTab === "popular") {
      if (popularQuery.isLoading) return <PopularTabSkeleton />;
      if (popularQuery.error) return <ErrorState message={(popularQuery.error as Error).message} />;
      return <PopularTab users={popularQuery.data?.users ?? []} />;
    }

    if (usageQuery.error) return <ErrorState message={(usageQuery.error as Error).message} />;
    return (
      <UsageTabBody
        users={usageQuery.data?.users ?? []}
        totalUsers={usageTotal}
        selectedDate={selectedDate}
        search={usageSearch}
        onDateChange={setSelectedDate}
        onSearchChange={setUsageSearch}
        loading={usageQuery.isFetching && !usageQuery.isLoading}
        rankMap={usageRankMap}
      />
    );
  };

  return (
    <div className="md:px-2">
      <main className="flex min-h-dvh w-full flex-col bg-neutral-100 dark:bg-neutral-950 lg:min-h-dvh">
        <div className="sticky top-15 z-30 flex h-15 w-full items-center justify-between border-b border-black/5 bg-white/95 px-3 font-semibold backdrop-blur dark:border-white/10 dark:bg-neutral-900/95 lg:top-0">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button
              onClick={handleBack}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100 active:bg-neutral-200 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700"
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-400 text-white dark:bg-white dark:text-black">
              <Trophy size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm text-neutral-950 dark:text-neutral-50 sm:text-base">
                Leaderboard
              </span>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                Points, popularity and daily usage
              </p>
            </div>
          </div>
        </div>

        <div className="sticky top-[7.5rem] z-20 border-b border-black/5 bg-neutral-100/95 px-1.5 py-1.5 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 md:px-0 lg:top-15">
          <div className="grid grid-cols-3 rounded-xl bg-white gap-1 p-1 shadow-sm dark:bg-neutral-900">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition sm:h-12 sm:justify-start sm:px-3 ${
                    activeTab === tab.id
                      ? "bg-blue-400 text-neutral-950 shadow-sm dark:bg-black dark:text-white"
                      : "text-neutral-600 hover:bg-blue-300 hover:text-neutral-900 active:bg-blue-400 dark:text-neutral-300 dark:hover:bg-neutral-950 dark:hover:text-neutral-100 dark:active:bg-black"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="min-w-0 truncate">{tab.label}</span>
                  <span className={`hidden min-w-0 truncate text-xs font-medium sm:inline ${
                    activeTab === tab.id
                      ? "text-neutral-800 dark:text-white/70"
                      : "text-neutral-400 dark:text-neutral-500"
                  }`}>
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-2 bg-neutral-100 px-1.5 pt-2 pb-3 dark:bg-neutral-950 md:px-0">
          {activeTab === "usage" && usageQuery.isLoading ? <UsageSkeleton /> : renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

export default LeaderboardPage;
