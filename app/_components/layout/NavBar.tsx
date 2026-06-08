import MenuBtn from "./MenuBtn";
import SideBar from "./SideBar";
import AddPostBtn from "../post/AddPostForm";
import SearchBtn from "./SearchBtn";
import HomeRefreshLink from "./HomeRefreshLink";

const NavBar = () => {
  return (
    <header className="bg-blue-400 dark:bg-black lg:bg-white dark:lg:bg-neutral-900 h-15 lg:h-dvh sticky top-0 w-full z-[70] lg:z-20 lg:w-2/9 shrink-0">
      <nav className="flex lg:flex-col justify-between lg:relative lg:items-center h-full lg:justify-normal lg:p-0 gap-2">
        <div className="flex justify-between items-center lg:flex-row-reverse w-full h-15 p-4 bg-blue-400 dark:bg-black">
          <div className="flex gap-1 justify-center items-center">
            <MenuBtn />
            <AddPostBtn state={"nav"} />
            <SearchBtn />
          </div>
          <HomeRefreshLink className="flex gap-2 items-center hover:opacity-90">

            <h1 className="text-neutral-900 dark:text-neutral-100 font-bold tracking-wide">HIVE</h1>
          </HomeRefreshLink>
        </div>

        <SideBar />
      </nav>
    </header>
  );
};

export default NavBar;
