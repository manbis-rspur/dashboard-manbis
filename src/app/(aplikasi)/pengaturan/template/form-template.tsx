"use client";

import { useActionState } from "react";
import { simpanTemplate } from "@/lib/template-actions";
import type { Balasan } from "@/lib/hasil";

const awal: Balasan = { ok: false, pesan: "" };

export function FormTemplate() {
  const [hasil, kirim, sedang] = useActionState(simpanTemplate, awal);

  return (
    <form action={kirim} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Berkas template (.docx)
        </span>
        <input
          type="file"
          name="berkas"
          accept=".docx"
          required
          className="rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium"
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
        className="w-fit rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : "Simpan template"}
      </button>
    </form>
  );
}
