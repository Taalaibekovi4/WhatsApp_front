import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ComboBox.scss";

const ComboBox = ({ placeholder, options = [], value, onChange, onSelect, filterFn, selectOnly = false }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || "");
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);

  const filtered = useMemo(() => {
    if (selectOnly) return options || [];
    const q = (input || "").toLowerCase();
    const f = typeof filterFn === "function" ? filterFn : (opt, qq) => String(opt.label || "").toLowerCase().includes(qq);
    return (options || []).filter((o) => f(o, q));
  }, [options, input, filterFn, selectOnly]);

  useEffect(() => { setInput(value || ""); }, [value]);

  useEffect(() => {
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (opt) => {
    onSelect?.(opt);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="combo-box" ref={wrapRef}>
      <input
        className="combo-box__field"
        placeholder={placeholder}
        value={input}
        readOnly={selectOnly}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          if (selectOnly) return;
          setInput(e.target.value);
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) choose(filtered[active]); }
          else if (e.key === "Escape") { setOpen(false); }
          else if (selectOnly) { e.preventDefault(); }
        }}
      />
      {open && (
        <div className="combo-box__menu">
          {filtered.length === 0 ? <div className="combo-box__empty">Ничего не найдено</div> : null}
          {filtered.map((o, idx) => (
            <div
              key={o.value + "_" + idx}
              className={"combo-box__item" + (idx === active ? " combo-box__item--active" : "")}
              onMouseEnter={() => setActive(idx)}
              onMouseDown={(e) => { e.preventDefault(); choose(o); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComboBox;
