export type PostViewPageParams = {
  postId: string;
};

export type PostViewPageProps = {
  params: Promise<PostViewPageParams>;
};
