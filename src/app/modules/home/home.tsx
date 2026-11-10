import React from "react";
import { translate } from "react-jhipster";
import { Link, useSearchParams } from "react-router";

import { useAppDispatch, useAppSelector } from "app/config/store";

export const Home = () => {
  const dispatch = useAppDispatch();
  const local = useAppSelector((state) => state.local);
  const [searchParams] = useSearchParams();

  const key = searchParams.get("key");

  return <h1>{translate("global.menu.home")}</h1>;
};

export default Home;
