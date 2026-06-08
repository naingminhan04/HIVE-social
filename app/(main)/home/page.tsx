import PostReel from "../../_components/post/PostReel";
import AddPostBtn from "@/app/_components/post/AddPostForm";

const HomePage = () => {
  return (
    <main>
      <PostReel />
      <AddPostBtn state={"reel"} />
    </main>
  );
};

export default HomePage;
