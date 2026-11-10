import "react-toastify/dist/ReactToastify.css";
import "./app.scss";
import "app/config/dayjs";

import React, { useEffect } from "react";
import { BrowserRouter } from "react-router";
import { ToastContainer } from "react-toastify";
import { useAppDispatch, useAppSelector } from "app/config/store";
import AppRoutes from "app/routes";
import ErrorBoundary from "app/shared/error/error-boundary";

import Header from "app/shared/layout/header/header";
import { setTextDirection } from "./config/translation";

const baseHref = document
  .querySelector("base")!
  .getAttribute("href")!
  .replace(/\/$/, "");

export const App = () => {
  const dispatch = useAppDispatch();

  const currentLocale = useAppSelector((state) => state.locale.currentLocale);

  useEffect(() => {
    setTextDirection(currentLocale);
  }, [currentLocale]);

  const paddingTop = "60px";
  return (
    <BrowserRouter basename={baseHref}>
      <div className="app-container" style={{ paddingTop }}>
        <ToastContainer
          position="top-left"
          className="toastify-container"
          toastClassName="toastify-toast"
        />
        <ErrorBoundary>
          <Header
            currentLocale={currentLocale}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        {/* Footer  */}
      </div>
    </BrowserRouter>
  );
};

export default App;
