// src/Api/products.js
import axios from "axios";

const BASE_URL = "https://testosh.pythonanywhere.com/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access");
  if (!token) throw new Error("Токен авторизации отсутствует.");
  return { Authorization: `Bearer ${token}` };
};

export const fetchProducts = async () => {
  try {
    const { data } = await axios.get(`${BASE_URL}/products/`, {
      headers: getAuthHeaders(),
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(
      `Ошибка загрузки данных продуктов: ${error.response?.data?.message || error.message}`
    );
  }
};

export const addProduct = async (productData) => {
  try {
    const { data } = await axios.post(`${BASE_URL}/products/`, productData, {
      headers: getAuthHeaders(),
    });
    return data;
  } catch (error) {
    throw new Error(
      `Ошибка при добавлении продукта: ${error.response?.data?.message || error.message}`
    );
  }
};

// ВАЖНО: PATCH (как у тебя было), НЕ PUT
export const updateProduct = async (id, productData) => {
  try {
    const { data } = await axios.patch(`${BASE_URL}/products/${id}/`, productData, {
      headers: getAuthHeaders(),
    });
    return data;
  } catch (error) {
    throw new Error(
      `Ошибка при обновлении продукта: ${error.response?.data?.message || error.message}`
    );
  }
};

export const deleteProduct = async (id) => {
  try {
    await axios.delete(`${BASE_URL}/products/${id}/`, {
      headers: getAuthHeaders(),
    });
    return true;
  } catch (error) {
    throw new Error(
      `Ошибка при удалении продукта: ${error.response?.data?.message || error.message}`
    );
  }
};

/**
 * Продажа «как раньше»: без отдельного /sell/, просто PATCH продукта.
 * 1) GET продукт
 * 2) проверка остатков
 * 3) PATCH со статусом/датой/ценой/количеством/счётчиком
 */
export const sellProduct = async (id, priceSelling, dateSelling, count) => {
  try {
    const { data: current } = await axios.get(`${BASE_URL}/products/${id}/`, {
      headers: getAuthHeaders(),
    });

    const qty = Number(current?.product_quantity ?? 0);
    const cnt = Number(count);
    if (!cnt || cnt <= 0) throw new Error("Количество должно быть больше 0.");
    if (qty < cnt) throw new Error("Недостаточно товара на складе.");

    const updatedQuantity = qty - cnt;
    // как у тебя было: хранить count как сумму, toFixed(2) оставляю для совместимости
    const updatedCount = (parseFloat(current.count || 0) + parseFloat(cnt)).toFixed(2);

    const payload = {
      status: updatedQuantity === 0 ? true : current.status,
      price_selling: priceSelling,
      date_selling: dateSelling,
      product_quantity: updatedQuantity,
      count: updatedCount,
    };

    const { data: updated } = await axios.patch(
      `${BASE_URL}/products/${id}/`,
      payload,
      { headers: getAuthHeaders() }
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Ошибка при продаже товара: ${error.response?.data?.message || error.message}`
    );
  }
};

export default {
  fetchProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  sellProduct,
};
