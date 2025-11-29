import React, { useState } from "react";
import GoodsList from "./GoodsList";
import GoodsSold from "./GoodsSold";
import "./GoodsTabs.scss";

const TABS = [
  { key: "list", label: "Список товаров" },
  { key: "sold", label: "Проданные товары" },
];

const GoodsTabs = () => {
  const [active, setActive] = useState("list");

  return (
    <section className="goods-tabs">
      <nav className="goods-tabs__nav" role="tablist" aria-label="Товары">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              id={`tab-${t.key}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${t.key}`}
              className={`goods-tabs__navItem${isActive ? " goods-tabs__navItem--active" : ""}`}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="goods-tabs__content">
        <div id="panel-list" role="tabpanel" aria-labelledby="tab-list" hidden={active !== "list"}>
          {active === "list" && <GoodsList />}
        </div>
        <div id="panel-sold" role="tabpanel" aria-labelledby="tab-sold" hidden={active !== "sold"}>
          {active === "sold" && <GoodsSold />}
        </div>
      </div>
    </section>
  );
};

export default GoodsTabs;
