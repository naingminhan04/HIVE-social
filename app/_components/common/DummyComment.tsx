const DummyComment = () => {
  return (
    <div className="flex gap-3 px-3 py-2 rounded-lg animate-pulse">
                  <div className="flex gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gray-400" />

                    <div className="flex flex-col flex-1 max-w-[80%]">
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 my-1">
                            <div className=" w-20 h-2 bg-gray-400 rounded-xs"></div>
                          </div>
                        </div>

                        <p className=" mt-1 bg-gray-400 w-30 h-7 rounded-md"></p>
                      </>
                    </div>
                  </div>
                </div>
  )
}

export default DummyComment
