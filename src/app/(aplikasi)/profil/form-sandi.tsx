"use client";

import { useActionState } from "react";
import { gantiSandi } from "@/lib/profil-actions";
import type { Balasan } from "@/lib/hasil";

const awal: Balasan = { ok: false, pesan: "" };

const gayaInput =
  "rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function FormSandi() {
  const [hasil, kirim, sedang] = useActionState(gantiSandi, awal);

  return (
    <form action={kirim} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Kata sandi sekarang
        </span>
        <input
          name="sandi_lama"
          type="password"
          required
          autoComplete="current-password"
          className={gayaInput}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Kata sandi baru
        </span>
        <input
          name="sandi_baru"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={gayaInput}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Ketik ulang kata sandi baru
        </span>
        <input
          name="sandi_ulang"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={gayaInput}
        />
      </label>

      {hasil.pesan && (
        <p className={`text-sm ${hasil.ok ? "text-hijau" : "text-merah"}`}>
          {hasil.pesan}
        </p>
      )}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded bg-hijau px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : "Ganti kata sandi"}
      </button>
    </form>
  );
}
