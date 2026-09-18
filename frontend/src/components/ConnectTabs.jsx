import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatList from "./ChatList";
import UserDirectory from "./UserDirectory";
import LogoSection from "./LogoSection";

const ConnectTabs = ({
  panelView,
  setPanelView,
  chats,
  selectedChat,
  onSelectChat,
  allUsers,
  onlineUsers,
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onUnfriend,
  onBlock,
  onUnblock,
  userId,
  onOpenSidebar,
  groups = [],
  onCreateGroup,
}) => {
  const tabs = [
    { id: "chats", label: "Chats" },
    { id: "discover", label: "People" },
  ];

  const [prevView, setPrevView] = useState(panelView);
  const [direction, setDirection] = useState(0);

  if (panelView !== prevView) {
    setPrevView(panelView);
    setDirection(panelView === "discover" ? 1 : -1);
  }

  const contentVariants = {
    hidden: (customDirection) => ({
      opacity: 0,
      x: customDirection === 0 ? 0 : customDirection * 50,
    }),
    visible: {
      opacity: 1,
      x: 0,
    },
    exit: (customDirection) => ({
      opacity: 0,
      x: customDirection === 0 ? 0 : -customDirection * 50,
    }),
  };

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-card/40 backdrop-blur-xl">
      <LogoSection onOpenSidebar={onOpenSidebar} />
      
      <div className="border-b border-white/10 px-4 pb-3 pt-1">
        <div className="relative flex w-full items-center rounded-[12px] border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
          {tabs.map((tab) => {
            const active = panelView === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPanelView(tab.id)}
                className={`relative w-full z-10 px-5 py-2.5 text-sm font-medium transition-colors duration-300 ${active ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
              >
                {active && (
                  <motion.div
                    layoutId="active-pill"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                    className="absolute inset-0 rounded-[12px] bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-purple-900/30"
                  />
                )}

                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={panelView}
          custom={direction}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={contentVariants}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-1 overflow-hidden"
        >
          {panelView === "chats" ? (
            <ChatList
              userId={userId}
              chats={chats}
              groups={groups}
              selectedChat={selectedChat}
              onSelect={onSelectChat}
              onlineUsers={onlineUsers}
              onCreateGroup={onCreateGroup}
              onBack={() => { }}
            />
          ) : (
            <UserDirectory
              users={allUsers}
              onlineUsers={onlineUsers}
              onSendRequest={onSendRequest}
              onAcceptRequest={onAcceptRequest}
              onDeclineRequest={onDeclineRequest}
              onUnfriend={onUnfriend}
              onSelect={onSelectChat}
              onBlock={onBlock}
              onUnblock={onUnblock}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ConnectTabs;
