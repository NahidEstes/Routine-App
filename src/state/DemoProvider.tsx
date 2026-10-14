import React, { createContext, useContext, useReducer, useState } from "react";
import { createDemoState } from "../data/mock";
import { DEMO_TODAY } from "../utils/dates";
import { demoReducer, type Action } from "./demoReducer";
import type { DemoState } from "../models/types";

type DemoContext = {
  state: DemoState;
  dispatch: React.Dispatch<Action>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
};
const Context = createContext<DemoContext | null>(null);
export function DemoProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(demoReducer, undefined, createDemoState);
  const [selectedDate, setSelectedDate] = useState(DEMO_TODAY);
  const [busy, setBusy] = useState(false);
  return (
    <Context.Provider
      value={{ state, dispatch, selectedDate, setSelectedDate, busy, setBusy }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("DemoProvider is missing");
  return context;
}
