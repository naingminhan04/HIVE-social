import type { PostType } from "./post";

export type EditPostFormValues = {
  content: string;
};

export type EditPostFormProps = {
  post: PostType;
  onClose: () => void;
};

export type UploadAssetKey = {
  key?: string;
};
