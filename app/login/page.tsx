"use client";

import { FormEvent, useState } from "react";
import styles from "./login.module.css";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "로그인에 실패했습니다.");
      setSubmitting(false);
      return;
    }
    window.location.assign("/");
  };

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.logo}>장사ERP</div>
        <p className={styles.eyebrow}>장사ERP 관리자</p>
        <h1 id="login-title">관리자 로그인</h1>
        <p className={styles.description}>운영 데이터와 매장 업무는 승인된 관리자만 확인할 수 있습니다.</p>
        <form onSubmit={submit}>
          <label>
            아이디
            <input autoComplete="username" name="username" required />
          </label>
          <label>
            비밀번호
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button disabled={submitting} type="submit">{submitting ? "확인 중..." : "로그인"}</button>
        </form>
      </section>
    </main>
  );
}
