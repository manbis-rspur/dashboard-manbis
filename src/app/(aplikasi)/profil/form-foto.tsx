"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";
import { potongPersegi } from "@/lib/potong-persegi";
import { simpanFotoProfil, hapusFotoProfil } from "@/lib/profil-actions";

const MAKS_ASLI = 15 * 1024 * 1024;

export function FormFoto({ nama, foto }: { nama: string; foto: string | null }) {
  const router = useRouter();
  const berkasRef = useRef<HTMLInputElement>(null);

  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function pilih(berkas: File) {
    setGalat(null);
    setPesan(null);

    if (berkas.size > MAKS_ASLI) {
      setGalat("Berkasnya terlalu besar. Maksimal 15 MB.");
      return;
    }

    setSibuk(true);
    try {
      // Dipotong dan diperkecil di peramban lebih dulu, jadi yang
      // melintas jaringan hanya puluhan KB.
      const kecil = await potongPersegi(berkas);
      setPratinjau(URL.createObjectURL(kecil));

      const db = createClient();
      const jalur = `profil/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

      const { error } = await db.storage.from("publik").upload(jalur, kecil, {
        contentType: "image/jpeg",
        upsert: false,
      });

      if (error) {
        setGalat("Gagal mengunggah: " + error.message);
        return;
      }

      const { data } = db.storage.from("publik").getPublicUrl(jalur);
      const h = await simpanFotoProfil(data.publicUrl);

      if (h.ok) {
        setPesan(h.pesan);
        router.refresh();
      } else {
        setGalat(h.pesan);
      }
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Gagal mengolah gambar.");
    } finally {
      setSibuk(false);
      if (berkasRef.current) berkasRef.current.value = "";
    }
  }

  async function buang() {
    setSibuk(true);
    setGalat(null);
    setPesan(null);

    const h = await hapusFotoProfil();
    if (h.ok) {
      setPratinjau(null);
      setPesan(h.pesan);
      router.refresh();
    } else {
      setGalat(h.pesan);
    }
    setSibuk(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar nama={nama} foto={pratinjau ?? foto} ukuran={84} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={sibuk}
            onClick={() => berkasRef.current?.click()}
            className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {sibuk ? "Memproses…" : foto ? "Ganti foto" : "Unggah foto"}
          </button>

          {foto && (
            <button
              type="button"
              disabled={sibuk}
              onClick={buang}
              className="rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-60"
            >
              Hapus foto
            </button>
          )}
        </div>

        <p className="text-xs text-tinta-3">
          Foto dipotong persegi otomatis. JPG atau PNG, maksimal 15 MB.
        </p>

        {pesan && <p className="text-sm text-hijau">{pesan}</p>}
        {galat && <p className="text-sm text-merah">{galat}</p>}

        <input
          ref={berkasRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const b = e.target.files?.[0];
            if (b) pilih(b);
          }}
        />
      </div>
    </div>
  );
}
