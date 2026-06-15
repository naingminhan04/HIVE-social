export interface Metadata {
    page: number;
    nextPage: number | null;
    totalPages: number;
    size: number;
    totalElements: number;
}

export interface PostType {
    id: string;
    content: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    author: Author
    images: PostImageType[]
    stats: PostStats
    isEdited: boolean;
    sharedPostId: string | null;
    reaction: {
        id: string;
        userId: string;
        postId: string;
        reactionType: ReactionType;
        createdAt: string;
        updatedAt: string;
        user: Pick<Author, 'id' | 'name' | 'username' | 'profilePic'>;
    } | null
    attachments?: PostImageType[];
    sharedPost?: string;
}


interface Author {
    id: string;
    username: string;
    name: string;
    email: string;
    nickname: string;
    profilePic: string | null;
}

 export interface PostImageType {
    id: string;
    key: string;
    thumbnailKey?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
    url: string;
    thumbnailUrl?: string;
 }


 export interface PostStats {
    reactions: ReactionCountType;
    comments: number;
    sharedCount: number;
 }

 export interface ReactionCountType {
        total: number;
        like: number;
        angry: number;
        love: number;
        haha: number;
        wow: number;
        sad: number;
 }


 export enum ReactionType {
    like = "LIKE",
    love = "LOVE",
    wow = "WOW",
    haha = "HAHA",
    angry = "ANGRY",
    sad = "SAD",
 }

 export interface ViewPostReactionResponse {
  metadata: Metadata;
  stats: ReactionCountType;
  reactions: PostReactionUserType[];
}


 export interface PostsResponseType {
    metadata: Metadata,
    posts: PostType[]
 }

export interface ImageKitResponse {
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadedImageType {
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ImageType {
    key: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
}

export interface AddPostType {
    content: string | null;
    sharedPostId?: string | null;
    images: ImageType[];
    attachments?: ImageType[];
}

export interface PostReactionType {
    metadata : Metadata;
    stats : ReactionCountType;
    reactions : PostReactionUserType[]
}

export interface PostReactionUserType {
  id: string;
  userId: string;
  targetId: string;
  targetType: string;
  postId: string;
  commentId: string | null;
  createdAt: string;
  updatedAt: string;
  reactionType: ReactionType;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    nickname: string | null;
    profilePic: string | null;
    coverPic: string | null;
  };
}



 