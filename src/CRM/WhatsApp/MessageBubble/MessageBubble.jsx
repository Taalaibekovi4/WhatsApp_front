import React from "react";
import "./MessageBubble.scss";

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const splitSegments = (text, query) => {
  const t = String(text || "");
  const q = String(query || "").trim();
  if (!q) return [{ t, hi: false }];
  const re = new RegExp(escapeRe(q), "gi");
  const out = [];
  let last = 0, m;
  while ((m = re.exec(t)) !== null) {
    if (m.index > last) out.push({ t: t.slice(last, m.index), hi: false });
    out.push({ t: t.slice(m.index, m.index + m[0].length), hi: true });
    last = m.index + m[0].length;
  }
  if (last < t.length) out.push({ t: t.slice(last), hi: false });
  return out;
};

const MessageBubble = ({ m = {}, onOpenMenu, selectedId, highlight = "", active = false, innerRef }) => {
  const t = String(m?.type || "").toLowerCase();
  if (t === "e2e_notification" || t === "protocolmessage" || t === "notification_template") return null;

  const body = String(m?.body || "");
  const looksCall = /call|звонок|видеозвонок|пропущ/i.test(body) || t === "call_log" || t === "call";
  const sender = !m.fromMe && m.isGroup ? (m.senderName || m.authorName || m.author || m.from || "") : "";
  const hasPayload = !!(m?.media || m?.location || m?.vcard || m?.quotedBody);
  if (!hasPayload && !body.trim()) return null;

  const parts = splitSegments(body, highlight);

  return (
    <div
      ref={innerRef}
      className={"thread__row " + (m?.fromMe ? "thread__row--out" : "thread__row--in")}
      onContextMenu={(e) => { e.preventDefault(); onOpenMenu?.(m, e.clientX, e.clientY); }}
    >
      <div className={"message-bubble" + (selectedId === m?.id ? " message-bubble--sel" : "") + (active ? " message-bubble--active" : "")}>
        {sender ? <div className="message-bubble__sender">{sender}</div> : null}
        {m?.quotedBody ? <div className="message-bubble__quote message-bubble__text">{m.quotedBody}</div> : null}

        {t === "image" && m?.media ? (
          <div className="message-bubble__media">
            <img src={`data:${m.media.mimetype};base64,${m.media.data}`} alt={m.media.filename || "image"} />
            {body ? <div className="message-bubble__text" style={{ marginTop: 6 }}>
              {parts.map((p,i)=>(p.hi?<mark key={i} className={"message-bubble__mark"+(active?" message-bubble__mark--active":"")}>{p.t}</mark>:<span key={i}>{p.t}</span>))}
            </div> : null}
          </div>
        ) : t === "video" && m?.media ? (
          <div className="message-bubble__media">
            <video controls src={`data:${m.media.mimetype};base64,${m.media.data}`} />
            {body ? <div className="message-bubble__text" style={{ marginTop: 6 }}>
              {parts.map((p,i)=>(p.hi?<mark key={i} className={"message-bubble__mark"+(active?" message-bubble__mark--active":"")}>{p.t}</mark>:<span key={i}>{p.t}</span>))}
            </div> : null}
          </div>
        ) : (t === "audio" || t === "ptt") && m?.media ? (
          <audio controls src={`data:${m.media.mimetype};base64,${m.media.data}`} />
        ) : t === "document" && m?.media ? (
          <a className="message-bubble__btn" href={`data:application/octet-stream;base64,${m.media?.data || ""}`} download={m.media?.filename || "document"}>Скачать документ</a>
        ) : t === "sticker" && m?.media ? (
          <div className="message-bubble__media"><img src={`data:${m.media.mimetype};base64,${m.media.data}`} alt="sticker" /></div>
        ) : t === "location" && m?.location ? (
          <div className="message-bubble__text">
            📍 {m.location.latitude?.toFixed(5)}, {m.location.longitude?.toFixed(5)}<br/>
            <a className="message-bubble__btn" href={`https://maps.google.com/?q=${m.location.latitude},${m.location.longitude}`} target="_blank" rel="noreferrer">Открыть карту</a>
          </div>
        ) : t === "vcard" && m?.vcard ? (
          <div className="message-bubble__text"><b>Контакт:</b><pre className="message-bubble__text" style={{margin:0}}>{m.vcard}</pre></div>
        ) : t === "revoked" ? (
          <div className="message-bubble__text">Сообщение удалено</div>
        ) : t === "buttons_response" ? (
          <div className="message-bubble__text">Ответ кнопкой: <b>{body || "—"}</b></div>
        ) : t === "list_response" ? (
          <div className="message-bubble__text">Выбор из списка: <b>{body || "—"}</b></div>
        ) : t === "reaction" ? (
          <div className="message-bubble__text">Реакция: <b>{body || "—"}</b></div>
        ) : looksCall ? (
          <div className="message-bubble__text">📞 {body || "Звонок"}</div>
        ) : (
          <div className="message-bubble__text">
            {parts.map((p,i)=>(p.hi?<mark key={i} className={"message-bubble__mark"+(active?" message-bubble__mark--active":"")}>{p.t}</mark>:<span key={i}>{p.t}</span>))}
          </div>
        )}

        <div className="message-bubble__time">{m?.timestamp ? new Date(m.timestamp * 1000).toLocaleTimeString() : ""}</div>
      </div>
    </div>
  );
};

export default MessageBubble;
