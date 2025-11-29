import React, { useEffect, useMemo, useState } from "react";
import { FaTimes, FaShoppingCart, FaCalendarAlt, FaHashtag } from "react-icons/fa";
import "./GoodsSell.scss";
import { sellProduct as apiSellProduct } from "../../Api/products";
import { useProductsStore } from "../../store/products";

const todayISO = () => {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const GoodsSell = ({ product, onClose, onSold }) => {
  const { update } = useProductsStore();
  const [date, setDate] = useState(todayISO());
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { setMsg(""); setDate(todayISO()); setQty("1"); }, [product]);

  const maxQty = Number(product?.product_quantity ?? 0);
  const price = Number(product?.product_price ?? 0);

  const totals = useMemo(() => {
    const q = Number(qty) || 0;
    return { q, sum: q * price, left: Math.max(0, maxQty - q) };
  }, [qty, price, maxQty]);

  const handleSell = async (e) => {
    e.preventDefault();
    setMsg("");
    const q = Number(qty);
    if (!date) return setMsg("Укажите дату продажи.");
    if (!q || q <= 0) return setMsg("Количество должно быть больше 0.");
    if (q > maxQty) return setMsg("Недостаточно товара на складе.");

    setLoading(true);
    try {
      const updated = await apiSellProduct(product.id, price, date, q);
      update?.(updated);
      onSold?.(updated);
      onClose?.();
    } catch {
      setMsg("Ошибка при продаже товара.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="goods-sell" role="dialog" aria-modal="true">
      <div className="goods-sell__box">
        <button type="button" className="goods-sell__close" onClick={onClose} aria-label="Закрыть">
          <FaTimes />
        </button>

        <h3 className="goods-sell__title">Продажа товара</h3>

        <form className="goods-sell__form" onSubmit={handleSell}>
          <label className="goods-sell__field">
            <span className="goods-sell__label">Товар</span>
            <input type="text" className="goods-sell__input goods-sell__input--ro" value={product?.name || ""} readOnly />
          </label>

          <label className="goods-sell__field">
            <span className="goods-sell__label"><FaCalendarAlt /> Дата продажи</span>
            <input type="date" className="goods-sell__input" value={date} onChange={(e) => setDate(e.target.value)} disabled={loading} />
          </label>

          <label className="goods-sell__field">
            <span className="goods-sell__label"><FaHashtag /> Количество</span>
            <input type="number" min="1" max={maxQty} className="goods-sell__input" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} disabled={loading} />
          </label>

          <div className="goods-sell__summary">
            <div className="goods-sell__row">
              <div><span className="goods-sell__cap">Цена за ед.:</span><p className="goods-sell__val">{price ? price.toLocaleString("ru-RU") + " KGS" : "—"}</p></div>
              <div><span className="goods-sell__cap">Количество:</span><p className="goods-sell__val">{totals.q ? `${totals.q} шт` : "—"}</p></div>
            </div>
            <div className="goods-sell__total"><span>Итоговая сумма:</span><p>{totals.sum ? totals.sum.toLocaleString("ru-RU") + " KGS" : "—"}</p></div>
            <div className="goods-sell__left"><span>Остаток после продажи:</span><p>{totals.left} шт</p></div>
          </div>

          {msg && <div className="goods-sell__alert" role="alert">{msg}</div>}

          <div className="goods-sell__actions">
            <button type="submit" className="goods-sell__btn goods-sell__btn--primary" disabled={loading}>
              {loading ? <span className="goods-sell__spinner" aria-label="Сохранение" /> : (<><FaShoppingCart /> Продать</>)}
            </button>
            <button type="button" className="goods-sell__btn goods-sell__btn--ghost" onClick={onClose} disabled={loading}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoodsSell;
