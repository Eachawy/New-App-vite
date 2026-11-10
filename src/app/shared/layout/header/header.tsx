import React, { useEffect, useRef } from "react";
import { Nav, Navbar } from "react-bootstrap";
import { Storage, Translate } from "react-jhipster";

import LoadingBar, { LoadingBarRef } from "react-top-loading-bar";

import { useAppDispatch, useAppSelector } from "app/config/store";
import { setLocale } from "app/shared/reducers/locale";
import { AccountMenu, AdminMenu, EntitiesMenu, LocaleMenu } from "../menus";

import { Brand, Home } from "./header-components";

export interface IHeaderProps {
  currentLocale: string;
}

const Header = (props: IHeaderProps) => {
  const dispatch = useAppDispatch();

  const handleLocaleChange = (langKey) => {
    Storage.session.set("locale", langKey);
    dispatch(setLocale(langKey));
  };

  return (
    <div id="app-header">
      <div
        onClick={() =>
          handleLocaleChange(props.currentLocale === "en" ? "ar" : "en")
        }
      >
        {props.currentLocale}
      </div>
    </div>
  );
};

export default Header;
