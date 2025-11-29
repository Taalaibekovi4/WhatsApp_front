import { useEffect, useMemo, useRef, useState } from "react";
import "./ProductsAdd.scss";
import { useProductsStore } from "../../../../store/products";

const PAGE_SIZE = 8;

const ProductsAdd = () => {
  const { items, load, create, error: storeError, clearError } = useProductsStore();

  const [productData, setProductData] = useState({
    name: "",
    product_price: "",
    product_date: "",
    product_quantity: "",
    status: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ===== UI: модалка =====
  const [isModalOpen, setIsModalOpen] = useState(false);
  const overlayRef = useRef(null);

  // пагинация превью
  const [page, setPage] = useState(1);

  // combobox для названия
  const [nameOpen, setNameOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [nameHover, setNameHover] = useState(-1);
  const nameWrapRef = useRef(null);
  const nameListRef = useRef(null);

  // загрузка продуктов из стора
  // useEffect(() => { load(); }, [load]);
  useEffect(() => { load(true); }, [load]); // force=true — чтобы не упереться в TTL-кэш

  // отображаем ошибки стора (если есть)
  useEffect(() => { if (storeError) setError(storeError); }, [storeError]);

  // закрытие комбобокса кликом вне
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (nameOpen && nameWrapRef.current && !nameWrapRef.current.contains(e.target)) {
        setNameOpen(false);
        setNameHover(-1);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [nameOpen]);

  // закрытие модалки по ESC
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e) => { if (e.key === "Escape") handleCloseModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  const products = items;

  const uniqueNames = useMemo(() => {
    const set = new Set(products.map((p) => String(p.name || "").trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [products]);

  const filteredNames = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return uniqueNames;
    return uniqueNames.filter((n) => n.toLowerCase().includes(q));
  }, [uniqueNames, nameQuery]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError("");
    setSuccess("");
    clearError();
    setProductData((prev) => ({
      ...prev,
      [name]:
        name === "product_price"
          ? value.replace(/[^0-9.]/g, "")
          : name === "product_quantity"
          ? value.replace(/\D/g, "")
          : value,
    }));
  };

  const validateInputs = () => {
    const nm = productData.name.trim();
    if (!nm) return "Название не может быть пустым.";
    if (nm.length < 2) return "Название должно содержать не менее 2 символов.";

    const price = parseFloat(productData.product_price);
    if (!price || price <= 0) return "Цена должна быть больше 0.";

    if (!productData.product_date) return "Дата обязательна.";

    const qty = parseInt(productData.product_quantity, 10);
    if (!qty || qty <= 0) return "Количество должно быть больше 0.";

    // проверка дубликатов: имя + дата
    const n = nm.toLowerCase();
    const d = productData.product_date;
    const dup = products.some(
      (p) => String(p.name || "").trim().toLowerCase() === n && String(p.product_date || "") === d
    );
    if (dup) return "Дубликат: продукт с таким названием и датой уже существует.";

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    clearError();

    const validationError = validateInputs();
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    const payload = {
      name: productData.name.trim(),
      product_price: Number(productData.product_price),
      product_date: productData.product_date,
      product_quantity: Number(productData.product_quantity),
      status: false,
    };

    const res = await create(payload);
    setSubmitting(false);

    if (res.ok) {
      // очистка и закрытие модалки
      setProductData({
        name: "",
        product_price: "",
        product_date: "",
        product_quantity: "",
        status: false,
      });
      setNameQuery("");
      setIsModalOpen(false);
      setNameOpen(false);
      setSuccess("Продукт добавлен.");
      setPage(1); // превью на первую страницу
    } else {
      setError("Ошибка при добавлении продукта.");
    }
  };

  const handleOpenModal = () => {
    setError("");
    setSuccess("");
    clearError();
    setIsModalOpen(true);
    setTimeout(() => { setNameQuery(productData.name); }, 0);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNameOpen(false);
    setNameHover(-1);
  };

  /* ===== превью + пагинация ===== */
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageSlice = products
    .slice()
    .sort((a, b) => String(b.product_date || "").localeCompare(String(a.product_date || "")))
    .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /* ===== клавиатура для комбобокса ===== */
  const onNameKeyDown = (e) => {
    if (e.key === "Tab" || e.key === "Escape") {
      setNameOpen(false);
      setNameHover(-1);
      return;
    }
    if (!nameOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setNameOpen(true); return; }
    if (!nameOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setNameHover((i) => Math.min(i + 1, filteredNames.length - 1));
      setTimeout(() => nameListRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" }), 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setNameHover((i) => Math.max(i - 1, 0));
      setTimeout(() => nameListRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" }), 0);
    } else if (e.key === "Enter") {
      if (nameHover >= 0 && nameHover < filteredNames.length) {
        e.preventDefault();
        const sel = filteredNames[nameHover];
        setProductData((prev) => ({ ...prev, name: sel }));
        setNameQuery(sel);
        setNameOpen(false);
        setNameHover(-1);
      }
    }
  };

  return (
    <div className="products-add">
      <div className="products-add__header">
        <h2 className="products-add__title">Продукты</h2>
        <button
          type="button"
          className="products-add__open-btn"
          onClick={handleOpenModal}
          aria-label="Открыть форму добавления"
        >
          Добавить продукт
        </button>
      </div>

      {success && <div className="products-add__banner products-add__banner--ok" role="status">{success}</div>}
      {error &&   <div className="products-add__banner products-add__banner--error" role="alert">{error}</div>}

      {/* МОДАЛКА: добавление продукта */}
      {isModalOpen && (
        <div
          className="products-add__modal-overlay"
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => { if (e.target === overlayRef.current) handleCloseModal(); }}
        >
          <div className="products-add__modal">
            <div className="products-add__modal-head">
              <h3 className="products-add__modal-title">Добавление продукта</h3>
              <button
                type="button"
                className="products-add__close"
                onClick={handleCloseModal}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="products-add__grid">
              {/* combobox "Название" */}
              <div className="products-add__combo" ref={nameWrapRef}>
                <label className="products-add__label">Название</label>
                <input
                  type="text"
                  name="name"
                  autoComplete="off"
                  placeholder="Название"
                  value={nameOpen ? nameQuery : productData.name}
                  onFocus={() => { setNameOpen(true); setNameQuery(productData.name); }}
                  onChange={(e) => {
                    setNameQuery(e.target.value);
                    setProductData((p) => ({ ...p, name: e.target.value }));
                  }}
                  onKeyDown={onNameKeyDown}
                  className="products-add__input"
                  role="combobox"
                  aria-expanded={nameOpen}
                  aria-controls="product-name-list"
                  aria-label="Название"
                />
                {nameOpen && filteredNames.length > 0 && (
                  <div
                    className="products-add__combo-menu"
                    role="listbox"
                    id="product-name-list"
                    ref={nameListRef}
                  >
                    <ul className="products-add__combo-list">
                      {filteredNames.map((n, idx) => {
                        const active = idx === nameHover;
                        return (
                          <li
                            key={n}
                            role="option"
                            aria-selected={active}
                            data-active={active ? "true" : "false"}
                            className={`products-add__combo-item${active ? " products-add__combo-item--active" : ""}`}
                            onMouseEnter={() => setNameHover(idx)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setProductData((prev) => ({ ...prev, name: n }));
                              setNameQuery(n);
                              setNameOpen(false);
                              setNameHover(-1);
                            }}
                          >
                            {n}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="products-add__field">
                <label className="products-add__label">Цена</label>
                <input
                  type="number"
                  name="product_price"
                  autoComplete="off"
                  placeholder="Цена товара"
                  value={productData.product_price}
                  onChange={handleChange}
                  min="0.01"
                  step="0.01"
                  required
                  className="products-add__input"
                  aria-label="Цена товара"
                />
              </div>

              <div className="products-add__field">
                <label className="products-add__label">Дата</label>
                <input
                  type="date"
                  name="product_date"
                  value={productData.product_date}
                  onChange={handleChange}
                  required
                  className="products-add__input"
                  aria-label="Дата"
                />
              </div>

              <div className="products-add__field">
                <label className="products-add__label">Количество</label>
                <input
                  type="number"
                  name="product_quantity"
                  autoComplete="off"
                  placeholder="Количество товара"
                  value={productData.product_quantity}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  required
                  className="products-add__input"
                  aria-label="Количество товара"
                />
              </div>

              <div className="products-add__actions">
                <button
                  type="submit"
                  className="products-add__btn"
                  disabled={submitting}
                  aria-label="Добавить продукт"
                >
                  {submitting ? <span className="products-add__spinner" /> : "Добавить"}
                </button>
                <button
                  type="button"
                  className="products-add__btn products-add__btn--cancel"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* превью с пагинацией */}
      <div className="products-add__preview" role="region" aria-label="Существующие продукты">
        <div className="products-add__preview-head">
          <h3 className="products-add__preview-title">Последние продукты</h3>
          <div className="products-add__pagination" role="navigation" aria-label="Пагинация">
            <button
              type="button"
              className="products-add__page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >←</button>
            <span className="products-add__page-indicator">{currentPage} / {totalPages}</span>
            <button
              type="button"
              className="products-add__page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >→</button>
          </div>
        </div>

        <div className="products-add__table-wrap">
          {products.length === 0 ? (
            <p className="products-add__empty">Пока нет данных</p>
          ) : (
            <table className="products-add__table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Цена</th>
                  <th>Дата</th>
                  <th>Кол-во</th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((p) => (
                  <tr key={`${p.id}-${p.product_date}`}>
                    <td>{p.name || "-"}</td>
                    <td>{p.product_price ?? "-"}</td>
                    <td>{p.product_date || "-"}</td>
                    <td>{p.product_quantity ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsAdd;
