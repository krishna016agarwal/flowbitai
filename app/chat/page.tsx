import Sidebar from "../components/slidebar";
import ChatWithData from "../components/ChatWithData";

export default function ChatPage() {
  return (
    <main className="flex h-screen w-full">
      <Sidebar width={"20%"} />
      <div className="flex-1 overflow-auto bg-gray-50">
        <ChatWithData />
      </div>
    </main>
  );
}
