"use client";

import { useState } from "react";

export function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);

  const logout = async () => {
    setSubmitting(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.assign("/login");
  };

  return (
    <button className="logout-button" disabled={submitting} onClick={logout} type="button">
      {submitting ? "로그아웃 중" : "로그아웃"}
    </button>
  );
}
