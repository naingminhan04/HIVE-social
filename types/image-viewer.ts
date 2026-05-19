export type ViewerImage = {
  id: string;
  url: string;
};

export type ImageViewerProps = {
  images: ViewerImage[] | string;
  index?: number;
  onClose: () => void;
  onChange?: (index: number) => void;
};
