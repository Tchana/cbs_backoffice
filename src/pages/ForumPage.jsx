import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/common/Header";
import { useApiLoader } from "../contexts/ApiLoaderContext";
import { GetRoomMessages, GetRooms, SendRoomMessage } from "../services/ForumManagement";
import { supabase } from "../lib/supabase";

const ForumPage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const listRef = useRef(null);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const loadRooms = async () => {
    const roomRows = await runWithLoader(() => GetRooms());
    setRooms(roomRows || []);
    if (!selectedRoomId && roomRows?.length) {
      setSelectedRoomId(roomRows[0].id);
    }
  };

  const loadMessages = async (roomId) => {
    if (!roomId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const rows = await runWithLoader(() => GetRoomMessages(roomId));
      setMessages(rows || []);
    } catch (e) {
      console.error("Failed to load room messages", e);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || "");
      } catch (_) {
        setCurrentUserId("");
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    loadRooms().catch((e) => console.error("Failed to load forum rooms", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    loadMessages(selectedRoomId).catch((e) =>
      console.error("Failed to load selected room messages", e)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!selectedRoomId || !content) return;

    setSending(true);
    try {
      await runWithLoader(() =>
        SendRoomMessage({
          roomId: selectedRoomId,
          content,
        })
      );
      setNewMessage("");
      await loadMessages(selectedRoomId);
    } catch (e) {
      console.error("Failed to send forum message", e);
    } finally {
      setSending(false);
    }
  };

  const getDateKey = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getDateLabel = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (msgDate.getTime() === today.getTime()) return "Today";
    if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString("en-GB");
  };

  const getTimeLabel = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex-1 relative z-10 overflow-auto">
      <Header title={"Forum"} />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="bg-gray-800/80 border border-gray-700 rounded-lg p-3 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">Rooms</h2>
              <button
                onClick={() => loadRooms()}
                className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-2">
              {rooms.length === 0 ? (
                <p className="text-gray-400 text-sm">No forum rooms available.</p>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full text-left rounded-md px-3 py-2 border ${
                      selectedRoomId === room.id
                        ? "bg-indigo-700/40 border-indigo-500 text-white"
                        : "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                    }`}
                  >
                    <p className="font-medium truncate">{room.name || "Unnamed room"}</p>
                    {room.description ? (
                      <p className="text-xs opacity-80 truncate">{room.description}</p>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="bg-gray-800/80 border border-gray-700 rounded-lg p-3 lg:col-span-2 flex flex-col min-h-[520px]">
            <div className="pb-3 border-b border-gray-700">
              <h2 className="text-white font-semibold">
                {selectedRoom?.name || "Select a room"}
              </h2>
              {selectedRoom?.description ? (
                <p className="text-gray-400 text-sm">{selectedRoom.description}</p>
              ) : null}
            </div>

            <div
              ref={listRef}
              className="flex-1 overflow-auto py-3 space-y-3 min-h-[360px]"
            >
              {!selectedRoomId ? (
                <p className="text-gray-400 text-sm">Pick a room to start messaging.</p>
              ) : loadingMessages ? (
                <p className="text-gray-400 text-sm">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-gray-400 text-sm">No messages yet.</p>
              ) : (
                messages.map((m, index) => {
                  const user = m.user || {};
                  const isCurrentUser =
                    !!currentUserId && (m.user_id || "") === currentUserId;
                  const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
                  const label = name || user.email || "Unknown user";
                  const createdAt = m.created_at || "";
                  const dateKey = getDateKey(createdAt);
                  const prevDateKey = index > 0 ? getDateKey(messages[index - 1]?.created_at) : "";
                  const showDateHeader = index === 0 || dateKey !== prevDateKey;
                  const timeLabel = getTimeLabel(createdAt);
                  return (
                    <div key={m.id}>
                      {showDateHeader ? (
                        <div className="flex justify-center my-2">
                          <span className="px-3 py-1 rounded-full bg-gray-700 text-gray-300 text-xs border border-gray-600">
                            {getDateLabel(createdAt)}
                          </span>
                        </div>
                      ) : null}
                      <div className={`flex ${isCurrentUser ? "justify-start" : "justify-end"}`}>
                        <div className="bg-gray-700 rounded-md p-3 max-w-[78%]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-indigo-300 text-sm font-semibold">{label}</p>
                            <p className="text-gray-400 text-xs">{timeLabel}</p>
                          </div>
                          <p className="text-gray-100 text-sm mt-1 whitespace-pre-wrap">
                            {m.content || ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-gray-700">
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    selectedRoomId
                      ? "Write a forum message..."
                      : "Select a room to send a message"
                  }
                  rows={2}
                  disabled={!selectedRoomId || sending}
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 disabled:opacity-60"
                />
                <button
                  onClick={handleSend}
                  disabled={!selectedRoomId || sending || newMessage.trim().length === 0}
                  className="px-4 py-2 h-fit bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ForumPage;

