import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import "../styles/colors.scss";
import "./WhatsAppUI.scss";
import Sidebar from "../Sidebar/Sidebar.jsx";
import MessageBubble from "../MessageBubble/MessageBubble.jsx";
import {
  FiPaperclip,
  FiMic,
  FiSend,
  FiX,
  FiCopy,
  FiCornerUpLeft,
  FiSearch,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";
import http from "../api/http.js";
import { socket } from "../api/socket.js";
import { config } from "../../../config/env.js";

const API_BASE = config.API_URL;
const COMMON_AVATAR = `${API_BASE}/uploads/avatar.jpg`;

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><clipPath id='c'><circle cx='48' cy='48' r='48'/></clipPath></defs><g clip-path='url(#c)'><rect width='96' height='96' fill='#2a3942'/><circle cx='48' cy='36' r='18' fill='#3a4b54'/><rect x='12' y='58' width='72' height='30' rx='15' fill='#3a4b54'/></g></svg>`
  );

const FAST_LIMIT = 60;
const FULL_LIMIT = 300;

const API_ROUTES = {
  CHATS: "/chats",
  MESSAGES: "/messages",
  MARK_SEEN: "/mark-seen",
  SEND_TEXT: "/send",
  SEND_MEDIA: "/send-media",
  LOGOUT: "/logout",
  QR: "/qr",
};

const SOCKET_EVENTS = {
  STATUS: "status",
  QR: "qr",
  MESSAGE: "message",
  CHAT_PATCH: "chat-patch",
  CHATS_REFRESH: "chats-refresh",
};

const sortChats = (list) =>
  (list || []).slice().sort((a, b) => {
    if (!!b.pinned - !!a.pinned) return !!b.pinned - !!a.pinned;
    if (!!b.unreadCount - !!a.unreadCount)
      return !!b.unreadCount - !!a.unreadCount;
    const at = Number(a?.lastTs || 0);
    const bt = Number(b?.lastTs || 0);
    if (bt !== at) return bt - at;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });

const sanitizeId = (id) =>
  String(id || "")
    .replace(/@c\.us$/i, "")
    .replace(/@g\.us$/i, "");

const pureDigits = (id) => String(id || "").replace(/\D/g, "");

const isSystem = (m) => {
  if (!m) return false;
  const t = String(m.type || "").toLowerCase();
  return (
    t === "e2e_notification" ||
    t === "protocolmessage" ||
    t === "call" ||
    t === "call_log"
  );
};

const patchChats = (prev, p) => {
  const map = new Map(prev.map((c) => [c.id, c]));
  const cur = map.get(p.id) || {
    id: p.id,
    name: `+${pureDigits(p.id)}`,
    picUrl: COMMON_AVATAR,
  };
  map.set(p.id, { ...cur, ...p });
  return sortChats([...map.values()]);
};

const normalizeMessages = (arr) =>
  (arr || [])
    .filter(Boolean)
    .filter((m) => !isSystem(m))
    .slice()
    .sort((a, b) => (a?.timestamp || 0) - (b?.timestamp || 0));

const WhatsAppUI = () => {
  const [status, setStatus] = useState({ ready: false });
  const [qr, setQr] = useState(null);
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [note, setNote] = useState("");
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, msg: null });
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIdx, setMatchIdx] = useState(-1);
  const [loadingFast, setLoadingFast] = useState(false);

  const threadRef = useRef(null);
  const fileRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const menuRef = useRef(null);
  const msgRefs = useRef(new Map());
  const msgCacheRef = useRef(new Map());
  const fetchSeqRef = useRef(0);
  const lastChatsPullRef = useRef(0);
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    });
  }, []);

  const setMsgsFor = useCallback((chatId, arr) => {
    const ordered = normalizeMessages(arr);
    msgCacheRef.current.set(chatId, ordered);
    if (selectedRef.current?.id === chatId) {
      setMessages(ordered);
    }
  }, []);

  const pullChats = useCallback(async () => {
    try {
      const r = await http.get(API_ROUTES.CHATS);
      const arr = Array.isArray(r.data) ? r.data : r.data?.results || [];
      const normalized = arr.map((c) => ({
        ...c,
        picUrl: COMMON_AVATAR,
      }));
      const sorted = sortChats(normalized);
      setChats((prev) => {
        const map = new Map(prev.map((x) => [x.id, x]));
        sorted.forEach((n) => {
          map.set(n.id, { ...map.get(n.id), ...n });
        });
        return sortChats([...map.values()]);
      });
      return sorted;
    } catch {
      return [];
    }
  }, []);

  const warmupPreviews = useCallback(async (list) => {
    const cold = (list || [])
      .filter((c) => !c.last || !Number(c.lastTs))
      .slice(0, 20);
    if (!cold.length) return;
    await Promise.all(
      cold.map(async (c) => {
        try {
          const r = await http.get(API_ROUTES.MESSAGES, {
            params: { chatId: c.id, limit: 1 },
          });
          const arr = Array.isArray(r.data) ? r.data : r.data?.results || [];
          const last = arr[arr.length - 1];
          if (last) {
            setChats((prev) =>
              sortChats(
                prev.map((x) =>
                  x.id === c.id
                    ? {
                        ...x,
                        last: last.preview || last.body || `(${last.type})`,
                        lastTs: Number(last.timestamp || 0),
                      }
                    : x
                )
              )
            );
          }
        } catch {
          /* ignore */
        }
      })
    );
  }, []);

  const safePullChats = useCallback(async () => {
    const now = Date.now();
    if (now - lastChatsPullRef.current < 1500) return;
    lastChatsPullRef.current = now;
    const list = await pullChats();
    warmupPreviews(list);
  }, [pullChats, warmupPreviews]);

  const fetchMessages = useCallback(
    async (chatId, limit) => {
      const seq = ++fetchSeqRef.current;
      try {
        const r = await http.get(API_ROUTES.MESSAGES, {
          params: { chatId, limit },
        });
        const arr = Array.isArray(r.data) ? r.data : r.data?.results || [];
        if (seq === fetchSeqRef.current) {
          setMsgsFor(chatId, arr);
        }
        if (arr.length) {
          const last = arr[arr.length - 1];
          setChats((prev) =>
            sortChats(
              prev.map((x) =>
                x.id === chatId
                  ? {
                      ...x,
                      last: last.preview || last.body || `(${last.type})`,
                      lastTs: Number(last.timestamp || 0),
                    }
                  : x
              )
            )
          );
        }
        return true;
      } catch {
        return false;
      }
    },
    [setMsgsFor]
  );

  const pullMessagesFast = useCallback(
    async (chatId) => {
      setLoadingFast(true);
      await fetchMessages(chatId, FAST_LIMIT);
      setLoadingFast(false);
      setTimeout(() => {
        fetchMessages(chatId, FULL_LIMIT);
      }, 300);
    },
    [fetchMessages]
  );

  const closeMenu = useCallback(() => {
    setMenu({ open: false, x: 0, y: 0, msg: null });
    setSelectedMsgId(null);
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (!menu.open) return;
      if (!menuRef.current?.contains(e.target)) closeMenu();
    };
    const onEsc = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menu.open, closeMenu]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const onScroll = () => {
      if (menu.open) closeMenu();
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [menu.open, closeMenu]);

  useEffect(() => {
    const handleStatus = async (s) => {
      setStatus(s);
      if (s.ready) {
        setQr(null);
        const list = await pullChats();
        warmupPreviews(list);
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
        refreshTimerRef.current = setInterval(() => {
          safePullChats();
        }, 20000);
      } else {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
        setSelected(null);
        setMessages([]);
      }
    };

    const handleQr = ({ dataUrl }) => {
      setQr(dataUrl);
    };

    // const handleMessage = (m) => {
    //   if (!m || isSystem(m)) return;
    //   const cache = msgCacheRef.current.get(m.chatId) || [];
    //   const exists = cache.find((x) => x.id === m.id);
    //   const nextCache = exists ? cache : [...cache, m];
    //   msgCacheRef.current.set(m.chatId, nextCache);
    //   if (selectedRef.current && m.chatId === selectedRef.current.id) {
    //     setMessages(normalizeMessages(nextCache));
    //     scrollToBottom();
    //   }
    //   setChats((prev) => {
    //     const has = prev.some((x) => x.id === m.chatId);
    //     const update = (arr) =>
    //       sortChats(
    //         arr.map((x) =>
    //           x.id === m.chatId
    //             ? {
    //                 ...x,
    //                 last: m.preview || m.body || `(${m.type})`,
    //                 lastTs: Number(m.timestamp || 0),
    //                 unreadCount: m.fromMe
    //                   ? x.unreadCount || 0
    //                   : selectedRef.current &&
    //                     selectedRef.current.id === m.chatId
    //                   ? 0
    //                   : (x.unreadCount || 0) + 1,
    //               }
    //             : x
    //         )
    //       );
    //     return has
    //       ? update(prev)
    //       : sortChats([
    //           {
    //             id: m.chatId,
    //             name: `+${pureDigits(m.chatId)}`,
    //             last: m.preview || m.body || `(${m.type})`,
    //             lastTs: Number(m.timestamp || 0),
    //             unreadCount: m.fromMe ? 0 : 1,
    //             isGroup: false,
    //             pinned: false,
    //             archived: false,
    //             picUrl: COMMON_AVATAR,
    //           },
    //           ...prev,
    //         ]);
    //   });
    // };

const handleMessage = (m) => {
  if (!m || isSystem(m)) return;

  const cache = msgCacheRef.current.get(m.chatId) || [];
  const exists = cache.find((x) => x.id === m.id);
  const nextCache = exists ? cache : [...cache, m];
  msgCacheRef.current.set(m.chatId, nextCache);

  // если этот чат сейчас открыт — сразу обновляем сообщения и скроллим вниз
  if (selectedRef.current && m.chatId === selectedRef.current.id) {
    setMessages(normalizeMessages(nextCache));
    scrollToBottom();
  }

  setChats((prev) => {
    // если этого чата ещё нет в списке – НИЧЕГО не делаем,
    // он появится по socket-событию "chat-patch" от сервера
    const has = prev.some((x) => x.id === m.chatId);
    if (!has) return prev;

    // только обновляем last/lastTs,
    // unreadCount вообще не трогаем (кроме случая, когда чат открыт)
    return sortChats(
      prev.map((x) =>
        x.id === m.chatId
          ? {
              ...x,
              last: m.preview || m.body || `(${m.type})`,
              lastTs: Number(m.timestamp || 0),
              unreadCount:
                selectedRef.current &&
                selectedRef.current.id === m.chatId
                  ? 0
                  : x.unreadCount || 0,
            }
          : x
      )
    );
  });
};


    const handleChatPatch = (p) => {
      if (!p || !p.id) return;
      setChats((prev) => patchChats(prev, p));
    };

    const handleChatsRefresh = () => {
      safePullChats();
    };

    socket.on(SOCKET_EVENTS.STATUS, handleStatus);
    socket.on(SOCKET_EVENTS.QR, handleQr);
    socket.on(SOCKET_EVENTS.MESSAGE, handleMessage);
    socket.on(SOCKET_EVENTS.CHAT_PATCH, handleChatPatch);
    socket.on(SOCKET_EVENTS.CHATS_REFRESH, handleChatsRefresh);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      socket.off(SOCKET_EVENTS.STATUS, handleStatus);
      socket.off(SOCKET_EVENTS.QR, handleQr);
      socket.off(SOCKET_EVENTS.MESSAGE, handleMessage);
      socket.off(SOCKET_EVENTS.CHAT_PATCH, handleChatPatch);
      socket.off(SOCKET_EVENTS.CHATS_REFRESH, handleChatsRefresh);
    };
  }, [pullChats, safePullChats, warmupPreviews, scrollToBottom]);

  const selectChat = useCallback(
    async (c) => {
      setSelected(c);
      setChats((prev) =>
        sortChats(
          prev.map((x) => (x?.id === c.id ? { ...x, unreadCount: 0 } : x))
        )
      );
      try {
        await http.post(API_ROUTES.MARK_SEEN, { chatId: c.id });
      } catch {
        /* ignore */
      }
      const cached = msgCacheRef.current.get(c.id);
      if (cached && cached.length) {
        setMessages(normalizeMessages(cached));
      }
      await pullMessagesFast(c.id);
      scrollToBottom();
    },
    [pullMessagesFast, scrollToBottom]
  );

  const onNewChat = useCallback((chatId, name) => {
    setChats((prev) => {
      const exists = prev.some((c) => c?.id === chatId);
      const now = Math.floor(Date.now() / 1000);
      const item = {
        id: chatId,
        name: name || sanitizeId(chatId),
        last: "",
        lastTs: now,
        unreadCount: 0,
        picUrl: COMMON_AVATAR,
      };
      const next = exists
        ? prev.map((c) => (c?.id === chatId ? { ...c, ...item } : c))
        : [item, ...prev];
      return sortChats(next);
    });
    setSelected({
      id: chatId,
      name: name || sanitizeId(chatId),
      picUrl: COMMON_AVATAR,
    });
    setMessages([]);
    msgCacheRef.current.set(chatId, []);
  }, []);

  const showNote = useCallback((msg) => {
    setNote(msg);
    setTimeout(() => setNote(""), 3000);
  }, []);

  const sendText = useCallback(
    async (e) => {
      e.preventDefault();
      if (!selectedRef.current || !text.trim()) return;
      const payload = {
        chatId: selectedRef.current.id,
        text: text.trim(),
      };
      if (replyTo?.id) payload.quotedMessageId = replyTo.id;
      try {
        await http.post(API_ROUTES.SEND_TEXT, payload);
        setText("");
        setReplyTo(null);
      } catch {
        showNote("Не удалось отправить сообщение");
      }
    },
    [text, replyTo, showNote]
  );

  const sendMedia = useCallback(
    async (file) => {
      if (!selectedRef.current || !file) return;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("chatId", selectedRef.current.id);
      if (replyTo?.id) fd.append("quotedMessageId", replyTo.id);
      try {
        await http.post(API_ROUTES.SEND_MEDIA, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setReplyTo(null);
        if (fileRef.current) fileRef.current.value = "";
      } catch {
        showNote("Не удалось отправить файл");
      }
    },
    [replyTo, showNote]
  );

  const openMenuMsg = useCallback((msg, x, y) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mw = 220;
    const mh = 100;
    const pad = 8;
    const nx = Math.max(pad, Math.min(x, vw - mw - pad));
    const ny = Math.max(pad, Math.min(y, vh - mh - pad));
    setSelectedMsgId(msg?.id || null);
    setMenu({ open: true, x: nx, y: ny, msg });
  }, []);

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const m of messages) {
      if (!m) continue;
      const b = String(m.body || "").toLowerCase();
      if (!b) continue;
      let i = 0;
      while (true) {
        const p = b.indexOf(q, i);
        if (p === -1) break;
        out.push({ id: m.id, pos: p });
        i = p + q.length;
      }
    }
    return out;
  }, [messages, searchQuery]);

  useEffect(() => {
    setMatchIdx(matches.length ? 0 : -1);
  }, [matches.length]);

  const activeMatchId = matchIdx >= 0 ? matches[matchIdx]?.id : null;

  useEffect(() => {
    if (!activeMatchId) return;
    const el = msgRefs.current.get(activeMatchId);
    const container = threadRef.current;
    if (!el || !container) return;
    const top = el.offsetTop - Math.max(60, container.clientHeight * 0.15);
    container.scrollTo({ top, behavior: "smooth" });
  }, [activeMatchId]);

  const nextMatch = useCallback(() => {
    if (!matches.length) return;
    setMatchIdx((i) => (i + 1) % matches.length);
  }, [matches.length]);

  const prevMatch = useCallback(() => {
    if (!matches.length) return;
    setMatchIdx((i) => (i - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const renderedMessages = useMemo(() => {
    const items = [];
    const now = new Date();
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    let lastKey = "";

    for (const m of messages.filter(Boolean)) {
      const d = new Date((Number(m.timestamp) || Date.now() / 1000) * 1000);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (key !== lastKey) {
        let label = d.toLocaleDateString();
        if (d.toDateString() === now.toDateString()) label = "Сегодня";
        else if (d.toDateString() === yest.toDateString()) label = "Вчера";
        items.push(
          <div key={`sep-${key}`} className="whatsapp__day-sep">
            {label}
          </div>
        );
        lastKey = key;
      }
      items.push(
        <MessageBubble
          key={m.id}
          m={m}
          onOpenMenu={openMenuMsg}
          selectedId={selectedMsgId}
          highlight={searchQuery}
          active={activeMatchId === m.id}
          innerRef={(el) => {
            if (el) msgRefs.current.set(m.id, el);
            else msgRefs.current.delete(m.id);
          }}
        />
      );
    }

    return items;
  }, [messages, openMenuMsg, selectedMsgId, searchQuery, activeMatchId]);

  const hasText = text.trim().length > 0;

  if (!status.ready) {
    return (
      <div className="whatsapp__qr">
        <h2>Свяжите устройство</h2>
        {qr ? (
          <img src={qr} alt="QR" />
        ) : (
          <div className="whatsapp__hint">Ждём QR…</div>
        )}
        <div className="whatsapp__hint">
          WhatsApp → Настройки → Связанные устройства → Связать устройство
        </div>
        <button
          className="whatsapp__btn whatsapp__btn--accent"
          onClick={async () => {
            try {
              const r = await http.get(API_ROUTES.QR);
              if (r.data?.dataUrl) setQr(r.data.dataUrl);
            } catch {
              /* ignore */
            }
          }}
        >
          Обновить QR
        </button>
      </div>
    );
  }

  return (
    <div className="whatsapp">
      <Sidebar
        selectedId={selected?.id}
        chats={chats}
        setChats={setChats}
        onSelect={selectChat}
        onRefresh={safePullChats}
        onLogout={async () => {
          try {
            await http.post(API_ROUTES.LOGOUT, {});
          } catch {
            /* ignore */
          }
          setSelected(null);
          setMessages([]);
          setQr(null);
          try {
            const r = await http.get(API_ROUTES.QR);
            if (r.data?.dataUrl) setQr(r.data.dataUrl);
          } catch {
            /* ignore */
          }
        }}
        onNewChat={onNewChat}
      />
      <main className="whatsapp__main">
        {selected ? (
          <>
            <div className="whatsapp__main-head">
              <div className="whatsapp__peer">
                <img
                  className="whatsapp__avatar whatsapp__avatar--small"
                  src={selected?.picUrl || COMMON_AVATAR}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                  alt=""
                />
                <div className="whatsapp__peer-meta">
                  <div className="whatsapp__peer-name">
                    {selected?.name || sanitizeId(selected?.id)}
                  </div>
                  <div className="whatsapp__peer-id">
                    {sanitizeId(selected?.id)}
                  </div>
                </div>
              </div>
              <div className="whatsapp__head-actions">
                {searchOpen ? (
                  <div className="whatsapp__search-inline">
                    <input
                      className="whatsapp__thread-search"
                      placeholder="Поиск по чату"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="whatsapp__match-counter">
                      {matches.length
                        ? `${matchIdx + 1} из ${matches.length}`
                        : "0 из 0"}
                    </div>
                    <button
                      className="whatsapp__btn"
                      onClick={prevMatch}
                      disabled={!matches.length}
                      aria-label="Назад"
                    >
                      <FiChevronUp />
                    </button>
                    <button
                      className="whatsapp__btn"
                      onClick={nextMatch}
                      disabled={!matches.length}
                      aria-label="Вперёд"
                    >
                      <FiChevronDown />
                    </button>
                    <button
                      className="whatsapp__btn"
                      onClick={() => setSearchOpen(false)}
                      aria-label="Закрыть"
                    >
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <button
                    className="whatsapp__btn"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Поиск по чату"
                  >
                    <FiSearch />
                  </button>
                )}
              </div>
            </div>

            <div
              className={
                "whatsapp__thread" + (loadingFast ? " is-loading" : "")
              }
              ref={threadRef}
            >
              {renderedMessages}
            </div>

            {replyTo ? (
              <div className="whatsapp__reply-row">
                <div className="whatsapp__reply-chip">
                  <div className="whatsapp__reply-title">Ответ на</div>
                  <div className="whatsapp__reply-text">
                    {replyTo.body || replyTo.type}
                  </div>
                </div>
                <button
                  type="button"
                  className="whatsapp__reply-cancel"
                  onClick={() => setReplyTo(null)}
                  aria-label="Отменить"
                >
                  <FiX />
                </button>
              </div>
            ) : null}

            <form className="whatsapp__compose" onSubmit={sendText}>
              <button
                type="button"
                className="whatsapp__btn"
                onClick={() => fileRef.current?.click()}
                aria-label="Прикрепить"
              >
                <FiPaperclip />
              </button>
              <input
                ref={fileRef}
                className="whatsapp__file"
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) sendMedia(e.target.files[0]);
                }}
              />
              <input
                className="whatsapp__input"
                type="text"
                placeholder="Введите сообщение"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                type={hasText ? "submit" : "button"}
                className="whatsapp__btn whatsapp__btn--accent"
                aria-label={hasText ? "Отправить" : "Голосовое"}
              >
                {hasText ? <FiSend /> : <FiMic />}
              </button>
            </form>

            {menu.open ? (
              <div
                ref={menuRef}
                className="whatsapp__menu"
                style={{ left: menu.x, top: menu.y }}
              >
                <button
                  className="whatsapp__menu-item"
                  onClick={() => {
                    setReplyTo(menu.msg);
                    closeMenu();
                  }}
                >
                  <FiCornerUpLeft /> Ответить
                </button>
                <div className="whatsapp__menu-sep" />
                <button
                  className="whatsapp__menu-item"
                  onClick={async () => {
                    try {
                      const txt = String(menu.msg?.body || "");
                      if (txt && navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(txt);
                      }
                    } catch {
                      /* ignore */
                    }
                    closeMenu();
                  }}
                >
                  <FiCopy /> Копировать
                </button>
              </div>
            ) : null}

            <div className="whatsapp__note">{note}</div>
          </>
        ) : (
          <div className="whatsapp__empty-main">Выберите чат слева</div>
        )}
      </main>
    </div>
  );
};

export default WhatsAppUI;
