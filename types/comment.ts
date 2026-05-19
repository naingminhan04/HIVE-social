import { Metadata, ImageType, PostImageType, PostType } from "./post"
import { UserType } from "./user"

export interface CommentResponseType {
  metadata: Metadata
  comments: CommentType[]
}

export interface CommentType {
  id: string
  userId: string
  postId: string
  replyId: string | null
  createdAt: string
  updatedAt: string
  content: string
  isEdited: boolean
  isDeleted: boolean
  user: Pick<UserType, 'id' | 'name' | 'username' | 'profilePic'>
  images: PostImageType[]
  stats: {
    reactions: number
    replies: number
  }
  isReacted: boolean
}

export interface AddCommentType {
  content: string
  replyId?: string | null
  images: ImageType[]
}

export type CommentFormMode = "create" | "reply" | "edit";

export interface CommentButtonProps {
  post: PostType;
  view: boolean;
}

export interface CommentPageProps {
  postId: string;
}

export interface CommentCardProps {
  comment: CommentType;
  postId: string;
  isDel: string[];
  isOwner: boolean;
  onDelete: (id: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onViewImage?: (url: string) => void;
}

export interface RepliesProps {
  commentId: string;
  postId: string;
  userId?: string;
  onReply: (comment: CommentType) => void;
  onEdit: (comment: CommentType) => void;
}

export interface CommentFormProps {
  postId: string;
  mode?: CommentFormMode;
  targetComment?: CommentType;
  commentToEdit?: CommentType;
  autoFocus?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  onViewImage?: (url: string) => void;
}

