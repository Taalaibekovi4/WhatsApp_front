import React, { useState } from "react";
import ProductsList from "../ProductsList/ProductsList";
import SoldProducts from "../ProductsSold/ProductsSold";
import "./ProductsTabs.scss";

const TABS = [
  { key: "list", label: "Список продуктов" },
  { key: "sold", label: "Проданные продукты" },
];

const ProductsTabs = () => {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <section className="products-tabs">
      <nav className="products-tabs__nav" role="tablist" aria-label="Продукты">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              id={`tab-${tab.key}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              className={`products-tabs__nav-item${
                isActive ? " products-tabs__nav-item--active" : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="products-tabs__content">
        <div
          id="panel-list"
          role="tabpanel"
          aria-labelledby="tab-list"
          hidden={activeTab !== "list"}
        >
          {activeTab === "list" && <ProductsList />}
        </div>

        <div
          id="panel-sold"
          role="tabpanel"
          aria-labelledby="tab-sold"
          hidden={activeTab !== "sold"}
        >
          {activeTab === "sold" && <SoldProducts />}
        </div>
      </div>
    </section>
  );
};

export default ProductsTabs;
