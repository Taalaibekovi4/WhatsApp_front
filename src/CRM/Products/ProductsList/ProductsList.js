import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaPen, FaTrash, FaShoppingCart, FaFilter } from "react-icons/fa";
import "./ProductsList.scss";
import { useProductsStore } from "../../../../store/products";
import ProductsSell from "../ProductsSell/ProductsSell";

const formatMoney = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString("ru-RU") + " KGS";
};

const LOW_STOCK_THRESHOLD = 10;

const ProductsList = () => {
  const { items, load, create, update, remove, loading } = useProductsStore();

  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  const [editModal, setEditModal] = useState({
    open: false,
    mode: "create",
    product: { id: null, name: "", product_price: "", product_date: "", product_quantity: "" },
  });

  const [sellModal, setSellModal] = useState({ open: false, product: null });

  useEffect(() => {
    load(true);
  }, [load]);

  const stats = useMemo(() => {
    const total = items.length;
    const totalQty = items.reduce((acc, p) => acc + (Number(p.product_quantity) || 0), 0);
    const totalCost = items.reduce((acc, p) => {
      const price = Number(p.product_price) || 0;
      const qty = Number(p.product_quantity) || 0;
      return acc + price * qty;
    }, 0);
    return { total, totalQty, totalCost };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = items;

    if (q) {
      base = base.filter((p) => {
        const name = String(p.name || "").toLowerCase();
        const date = String(p.product_date || "").toLowerCase();
        return name.includes(q) || date.includes(q);
      });
    }

    if (showLowStock) {
      base = base.filter((p) => Number(p.product_quantity) < LOW_STOCK_THRESHOLD);
    }

    return base;
  }, [items, search, showLowStock]);

  const openCreate = () => {
    setEditModal({
      open: true,
      mode: "create",
      product: {
        id: null,
        name: "",
        product_price: "",
        product_date: "",
        product_quantity: "",
      },
    });
  };

  const openEdit = (p) => {
    setEditModal({
      open: true,
      mode: "edit",
      product: {
        id: p.id,
        name: p.name || "",
        product_price: String(p.product_price ?? ""),
        product_date: p.product_date || "",
        product_quantity: String(p.product_quantity ?? ""),
      },
    });
  };

  const closeEdit = () => {
    setEditModal((s) => ({ ...s, open: false }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditModal((prev) => ({
      ...prev,
      product: {
        ...prev.product,
        [name]:
          name === "product_price" || name === "product_quantity"
            ? value.replace(/[^\d.]/g, "")
            : value,
      },
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const p = editModal.product;
    if (!p.name.trim()) return;
    if (!p.product_price) return;
    if (!p.product_date) return;
    if (!p.product_quantity) return;

    const payload = {
      name: p.name.trim(),
      product_price: Number(p.product_price),
      product_date: p.product_date,
      product_quantity: Number(p.product_quantity),
      status: false,
    };

    if (editModal.mode === "create") {
      const res = await create(payload);
      if (res?.ok) closeEdit();
    } else {
      const res = await update(p.id, payload);
      if (res?.ok) closeEdit();
    }
  };

  const handleDelete = async (p) => {
    await remove(p.id);
  };

  const handleOpenSell = (p) => {
    setSellModal({ open: true, product: p });
  };

  const handleSold = () => {
    setSellModal({ open: false, product: null });
  };

  const handleCloseSell = () => {
    setSellModal({ open: false, product: null });
  };

  return (
    <div className="product-list">
      <h2 className="product-list__page-title">Продукты</h2>

      <div className="product-list__card">
        <div className="product-list__head">
          <div>
            <h3 className="product-list__title">Список продуктов</h3>
            <div className="product-list__stats">
              <span>Товаров: {stats.total}</span>
              <span className="product-list__link">Общее количество: {stats.totalQty}</span>
              <span className="product-list__link product-list__link--green">
                Общая стоимость: {formatMoney(stats.totalCost)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="product-list__add-btn"
            onClick={openCreate}
            aria-label="Добавить продукт"
          >
            <FaPlus /> Добавить продукт
          </button>
        </div>

        <div className="product-list__filter">
          <input
            type="text"
            className="product-list__search"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className={`product-list__low-btn${
              showLowStock ? " product-list__low-btn--active" : ""
            }`}
            onClick={() => setShowLowStock((v) => !v)}
            aria-pressed={showLowStock}
          >
            <FaFilter />
            Меньше 10
          </button>
        </div>

        <div className="product-list__table-wrap">
          <table className="product-list__table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Цена</th>
                <th>Дата</th>
                <th>Количество</th>
                <th className="product-list__th-actions">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="product-list__loader" aria-label="Загрузка..." />
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name || "-"}</td>
                    <td className="product-list__price">{formatMoney(p.product_price)}</td>
                    <td>{p.product_date || "-"}</td>
                    <td>
                      <span
                        className={`product-list__qty-pill${
                          Number(p.product_quantity) < LOW_STOCK_THRESHOLD
                            ? " product-list__qty-pill--low"
                            : ""
                        }`}
                      >
                        {p.product_quantity ?? 0} шт
                      </span>
                    </td>
                    <td className="product-list__actions">
                      <button
                        type="button"
                        className="product-list__sell-btn"
                        onClick={() => handleOpenSell(p)}
                      >
                        <FaShoppingCart /> Продать
                      </button>
                      <button
                        type="button"
                        className="product-list__icon-btn"
                        onClick={() => openEdit(p)}
                        aria-label="Изменить"
                      >
                        <FaPen />
                      </button>
                      <button
                        type="button"
                        className="product-list__icon-btn"
                        onClick={() => handleDelete(p)}
                        aria-label="Удалить"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="product-list__empty">
                    Нет продуктов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editModal.open && (
        <div className="product-list__modal" role="dialog" aria-modal="true">
          <div className="product-list__modal-box">
            <h3 className="product-list__modal-title">
              {editModal.mode === "create" ? "Новый продукт" : "Редактирование продукта"}
            </h3>
            <form className="product-list__form" onSubmit={handleEditSubmit}>
              <label className="product-list__field">
                <span className="product-list__label">Название</span>
                <input
                  name="name"
                  value={editModal.product.name}
                  onChange={handleEditChange}
                  className="product-list__input"
                  placeholder="Введите название продукта"
                  autoComplete="off"
                  required
                />
              </label>
              <label className="product-list__field">
                <span className="product-list__label">Цена (₸)</span>
                <input
                  name="product_price"
                  type="number"
                  value={editModal.product.product_price}
                  onChange={handleEditChange}
                  className="product-list__input"
                  placeholder="Введите цену"
                  min="0"
                  step="0.01"
                  required
                />
              </label>
              <label className="product-list__field">
                <span className="product-list__label">Дата</span>
                <input
                  name="product_date"
                  type="date"
                  value={editModal.product.product_date}
                  onChange={handleEditChange}
                  className="product-list__input"
                  required
                />
              </label>
              <label className="product-list__field">
                <span className="product-list__label">Количество</span>
                <input
                  name="product_quantity"
                  type="number"
                  value={editModal.product.product_quantity}
                  onChange={handleEditChange}
                  className="product-list__input"
                  placeholder="Введите количество"
                  min="1"
                  required
                />
              </label>

              <div className="product-list__modal-actions">
                <button
                  type="submit"
                  className="product-list__btn product-list__btn--primary"
                  disabled={loading}
                >
                  {editModal.mode === "create" ? "Добавить" : "Сохранить"}
                </button>
                <button
                  type="button"
                  className="product-list__btn product-list__btn--ghost"
                  onClick={closeEdit}
                  disabled={loading}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {sellModal.open && sellModal.product && (
        <ProductsSell
          product={sellModal.product}
          onClose={handleCloseSell}
          onSold={handleSold}
        />
      )}
    </div>
  );
};

export default ProductsList;
