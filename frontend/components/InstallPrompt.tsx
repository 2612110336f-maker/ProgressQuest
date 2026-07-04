"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

const DISMISS_KEY = "pq-install-dismissed-at";
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const InstallPrompt = () => {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const getStoredValue = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const setStoredValue = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore storage failures on restrictive mobile browsers
    }
  };

  useEffect(() => {
    const dismissedAt = getStoredValue(DISMISS_KEY);
    if (dismissedAt) {
      const elapsedDays = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (elapsedDays < DISMISS_DAYS) return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const { outcome } = await deferredEvent.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      setStoredValue(DISMISS_KEY, String(Date.now()));
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setStoredValue(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-80 z-50">
      <div className="card-fantasy flex items-start gap-3 p-4">
        <Image
          src="/icon-192.png"
          alt="ProgressQuest"
          width={40}
          height={40}
          className="rounded-xl shrink-0"
        />
        <div className="flex-1">
          <p className="font-display text-sm font-bold text-[#2D6A4F]">
            ホーム画面に追加しませんか？
          </p>
          <p className="text-xs text-[#888888] mt-0.5">
            アプリのように起動できて、次の冒険にすぐ戻れます
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="text-xs font-bold text-white bg-[#2D6A4F] rounded-lg px-3 py-1.5 hover:opacity-90 transition"
            >
              追加する
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-[#888888] rounded-lg px-3 py-1.5 hover:text-[#2C2C2C] transition"
            >
              今はしない
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
