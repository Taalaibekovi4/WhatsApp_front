// src/components/Sidebar/Sidebar.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { FiRefreshCw, FiLogOut, FiSearch, FiFilter } from "react-icons/fi";
import "./Sidebar.scss";
import http from "../api/http.js";
import { socket } from "../api/socket.js";
import { config } from "../../../config/env.js";
import axios from "axios";

const API_BASE = config.API_URL;
const COMMON_AVATAR = `${API_BASE}/uploads/avatar.jpg`;
const PAGE_SIZE = 40;

// Django /api/requests/
const LEADS_API = axios.create({
  baseURL:
    config.LEADS_API_URL || "https://rasu0101.pythonanywhere.com",
});

const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><clipPath id='c'><circle cx='48' cy='48' r='48'/></clipPath></defs><g clip-path='url(#c)'><rect width='96' height='96' fill='#2a3942'/><circle cx='48' cy='36' r='18' fill='#3a4b54'/><rect x='12' y='58' width='72' height='30' rx='15' fill='#3a4b54'/></g></svg>`
  );

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "");
const isStatusChat = (c) =>
  /status@broadcast/i.test(String(c?.id || "")) ||
  /^status$/i.test(String(c?.name || ""));

const fmtTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  const n = new Date();
  const y = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const yest = new Date(y.getTime() - 86400000);
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dd.getTime() === y.getTime())
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (dd.getTime() === yest.getTime()) return "Вчера";
  return d.toLocaleDateString();
};

// только для отображения
const formatNumberNice = (s) => {
  const d = String(s || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("996"))
    return `+996 ${d.slice(3, 6)} ${d.slice(6, 9)}-${d.slice(9, 11)}-${d.slice(
      11
    )}`;
  if (d.length === 11 && d.startsWith("7"))
    return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(
      9
    )}`;
  if (d.length >= 10)
    return `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)}-${d.slice(
      8,
      10
    )}${d.length > 10 ? `-${d.slice(10, 12)}` : ""}`;
  return `+${d}`;
};

// ключ для дедупа телефонов
const normalizePhoneKey = (raw) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";

  // 0XXXXXXXXX -> 996XXXXXXXXX
  if (d.length === 10 && d.startsWith("0")) {
    return "996" + d.slice(1);
  }
  // XXXXXXXXX -> 996XXXXXXXXX
  if (d.length === 9) {
    return "996" + d;
  }
  // уже 996XXXXXXXXXXX
  if (d.length === 12 && d.startsWith("996")) {
    return d;
  }
  return d;
};

const mergeChats = (prev, fresh) => {
  const map = new Map(prev.map((c) => [c.id, c]));
  fresh.forEach((n) => {
    const cur = map.get(n.id) || {};
    map.set(n.id, { ...cur, ...n });
  });
  return [...map.values()];
};

const applyPatch = (prev, p) => {
  const map = new Map(prev.map((c) => [c.id, c]));
  const cur =
    map.get(p.id) || {
      id: p.id,
      name: `+${String(p.id).replace(/\D/g, "")}`,
      picUrl: COMMON_AVATAR,
    };
  map.set(p.id, { ...cur, ...p });
  return [...map.values()];
};

const Sidebar = ({
  selectedId,
  chats,
  setChats,
  onSelect,
  onRefresh,
  onLogout,
}) => {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterKey, setFilterKey] = useState("all");

  const [menu, setMenu] = useState({
    open: false,
    x: 0,
    y: 0,
    chat: null,
  });

  const menuRef = useRef(null);
  const loadingRef = useRef(false);

  // телефоны, по которым уже есть заявки
  const requestPhonesRef = useRef(new Set());

  // подгружаем заявки и собираем телефоны
  useEffect(() => {
    const loadPhones = async () => {
      try {
        const res = await LEADS_API.get("/api/requests/");
        const arr = Array.isArray(res.data)
          ? res.data
          : res.data?.results || [];
        const set = new Set();
        arr.forEach((r) => {
          const key = normalizePhoneKey(r.phone);
          if (key) set.add(key);
        });
        requestPhonesRef.current = set;
      } catch (err) {
        console.error(
          "Не смог загрузить список заявок:",
          err?.response?.data || err.message
        );
      }
    };
    loadPhones();
  }, []);

  const mapChats = (arr) =>
    arr
      .filter((c) => !isStatusChat(c))
      .map((c) => {
        const id = c.id;
        const name = c.name || formatNumberNice(c.id);
        const picUrl = COMMON_AVATAR;
        const status = c.status || (c.isLead === true ? "lead" : "client");
        return { ...c, id, name, picUrl, status, isLead: status === "lead" };
      });

  const pullChats = useCallback(async () => {
    try {
      loadingRef.current = true;
      const r = await http.get("/chats");
      const src = Array.isArray(r.data) ? r.data : r.data?.results || [];
      const cleaned = mapChats(src);
      setChats((prev) => mergeChats(prev, cleaned));
      loadingRef.current = false;
      return cleaned.length > 0;
    } catch {
      loadingRef.current = false;
      return false;
    }
  }, [setChats]);

  // отправка чата в заявки (по правому клику)
  const sendToRequests = useCallback(async (chat) => {
    if (!chat || !chat.id) return;

    const digits = String(chat.id || "").replace(/\D/g, "");
    const key = normalizePhoneKey(digits);
    if (!key) {
      console.error("Не удалось распарсить номер из chat.id:", chat.id);
      setMenu({ open: false, x: 0, y: 0, chat: null });
      return;
    }

    // формат для бэка: +9967...
    const phoneForBackend = `+${key}`;

    // если уже есть заявка по этому номеру — выходим
    if (requestPhonesRef.current.has(key)) {
      setMenu({ open: false, x: 0, y: 0, chat: null });
      return;
    }

    const payload = {
      name: "whatsapp",      // как ты просил
      phone: phoneForBackend,
      channel: "whatsapp",
      status: "new",
    };

    try {
      const res = await LEADS_API.post("/api/requests/", payload);
      // помечаем номер как уже имеющий заявку
      requestPhonesRef.current.add(key);
    } catch (err) {
      console.error(
        "Не удалось создать заявку из чата",
        err?.response?.data || err.message
      );
    }

    setMenu({ open: false, x: 0, y: 0, chat: null });
  }, []);

  const hasRequestForChat = (chat) => {
    if (!chat || !chat.id) return false;
    const digits = String(chat.id || "").replace(/\D/g, "");
    const key = normalizePhoneKey(digits);
    if (!key) return false;
    return requestPhonesRef.current.has(key);
  };

  useEffect(() => {
    const onPatch = (p) => {
      if (!p || !p.id) return;
      setChats((prev) => applyPatch(prev, p));
    };

    const onAvatar = () => {
      setChats((prev) =>
        prev.map((c) => ({ ...c, picUrl: COMMON_AVATAR }))
      );
    };

    socket.on("chats-refresh", pullChats);
    socket.on("chat-patch", onPatch);
    socket.on("chat-avatar", onAvatar);
    pullChats();

    return () => {
      socket.off("chats-refresh", pullChats);
      socket.off("chat-patch", onPatch);
      socket.off("chat-avatar", onAvatar);
    };
  }, [pullChats, setChats]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!menu.open) return;
      if (!menuRef.current?.contains(e.target))
        setMenu({ open: false, x: 0, y: 0, chat: null });
    };
    const onEsc = (e) => {
      if (e.key === "Escape")
        setMenu({ open: false, x: 0, y: 0, chat: null });
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menu.open]);

  const baseList = useMemo(
    () => (Array.isArray(chats) ? chats.slice() : []),
    [chats]
  );

  const filteredBase = useMemo(() => {
    let arr = baseList;
    if (filterKey === "unread")
      arr = arr.filter((c) => Number(c.unreadCount || 0) > 0);
    else if (filterKey === "groups") arr = arr.filter((c) => !!c.isGroup);
    else if (filterKey === "direct") arr = arr.filter((c) => !c.isGroup);
    return arr;
  }, [baseList, filterKey]);

  const list = useMemo(() => {
    const q = norm(query);
    const arr = filteredBase.filter(
      (c) => norm(c.name).includes(q) || norm(c.id).includes(q)
    );
    return arr.slice(0, page * PAGE_SIZE);
  }, [filteredBase, query, page]);

  const openMenu = (e, chat) => {
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mw = 220;
    const mh = 80;
    const pad = 8;
    const nx = Math.max(pad, Math.min(e.clientX, vw - mw - pad));
    const ny = Math.max(pad, Math.min(e.clientY, vh - mh - pad));
    setMenu({ open: true, x: nx, y: ny, chat });
  };

  return (
    <aside className="whatsappSidebar">
      <div className="whatsappSidebar__head">
        <div className="whatsappSidebar__title">Чаты</div>
        <div className="whatsappSidebar__actions">
          <button
            className="whatsappSidebar__btn"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-label="Фильтр"
          >
            <FiFilter />
          </button>
          <button
            className="whatsappSidebar__btn"
            onClick={onRefresh}
            aria-label="Обновить"
            disabled={loadingRef.current}
          >
            <FiRefreshCw />
          </button>
          <button
            className="whatsappSidebar__btn"
            onClick={onLogout}
            aria-label="Выйти"
          >
            <FiLogOut />
          </button>
        </div>
      </div>

      <div className="whatsappSidebar__search">
        <FiSearch className="whatsappSidebar__search-icon" />
        <input
          className="whatsappSidebar__input"
          placeholder="Поиск по чату"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {filtersOpen ? (
        <div className="whatsappSidebar__filters">
          <button
            className={
              "whatsappSidebar__filters-item" +
              (filterKey === "unread" ? " is-active" : "")
            }
            onClick={() => {
              setFilterKey("unread");
              setFiltersOpen(false);
            }}
          >
            Непрочитанные
          </button>
          <button
            className={
              "whatsappSidebar__filters-item" +
              (filterKey === "groups" ? " is-active" : "")
            }
            onClick={() => {
              setFilterKey("groups");
              setFiltersOpen(false);
            }}
          >
            Группы
          </button>
          <button
            className={
              "whatsappSidebar__filters-item" +
              (filterKey === "direct" ? " is-active" : "")
            }
            onClick={() => {
              setFilterKey("direct");
              setFiltersOpen(false);
            }}
          >
            Личные
          </button>
          <button
            className={
              "whatsappSidebar__filters-item" +
              (filterKey === "all" ? " is-active" : "")
            }
            onClick={() => {
              setFilterKey("all");
              setFiltersOpen(false);
            }}
          >
            Все
          </button>
        </div>
      ) : null}

      {/* блока "+ Новый" больше нет */}

      <div
        className="whatsappSidebar__list"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
            if (list.length < (filteredBase || []).length) {
              setPage((p) => p + 1);
            }
          }
        }}
      >
        {list.length === 0 ? (
          <div className="whatsappSidebar__empty">Нет чатов</div>
        ) : null}
        {list.map((c) => (
          <div
            key={c.id}
            className={
              "whatsappSidebar__item" +
              (c.id === selectedId ? " whatsappSidebar__item--active" : "")
            }
            onClick={() => onSelect(c)}
            onContextMenu={(e) => openMenu(e, c)}
          >
            <img
              className="whatsappSidebar__avatar"
              src={c.picUrl || COMMON_AVATAR}
              onError={(e) => {
              e.currentTarget.src = DEFAULT_AVATAR;
              }}
              alt=""
            />
            <div className="whatsappSidebar__meta">
              <div className="whatsappSidebar__row-top">
                <div className="whatsappSidebar__name">
                  {c.name || formatNumberNice(c.id)}
                </div>
                <div className="whatsappSidebar__time">
                  {fmtTime(c.lastTs)}
                </div>
              </div>
              <div className="whatsappSidebar__row-bottom">
                <div className="whatsappSidebar__last">
                  {c.last || ""}
                </div>
                {c.unreadCount ? (
                  <span className="whatsappSidebar__badge">
                    {c.unreadCount}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {menu.open ? (
        <div
          ref={menuRef}
          className="whatsappSidebar__menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            className="whatsappSidebar__menu-item"
            onClick={() => sendToRequests(menu.chat)}
            disabled={hasRequestForChat(menu.chat)}
          >
            {hasRequestForChat(menu.chat)
              ? "Уже в заявках"
              : "Отправить в заявки"}
          </button>
        </div>
      ) : null}
    </aside>
  );
};

export default Sidebar;
