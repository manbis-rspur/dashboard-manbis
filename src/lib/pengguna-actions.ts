"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Hasil = { pesan: string | null; berhasil: string | null };
export const hasilAwal: Hasil = { pesan: null, berhasil: null };

/** Semua pekerjaan di berkas ini hanya boleh dilakukan Admin. */
async function pastikanAdmin(): Promise<string | null> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return "Sesi Anda sudah berakhir. Muat ulang halaman lalu masuk lagi.";
  if (pengguna.peran !== "Admin") return "Hanya Koordinator yang boleh mengatur pengguna.";
  return null;
}

/**
 * Membuatkan akun login untuk seorang anggota.
 *
 * Kata sandi awal diketik oleh Koordinator, lalu sebaiknya diganti
 * sendiri oleh yang bersangkutan setelah berhasil masuk pertama kali.
 */
export async function buatAkunLogin(_s: Hasil, formData: FormData): Promise<Hasil> {
  const galat = await pastikanAdmin();
  if (galat) return { pesan: galat, berhasil: null };

  const penggunaId = Number(formData.get("pengguna_id"));
  const sandi = String(formData.get("sandi") ?? "");

  if (sandi.length < 8) {
    return { pesan: "Kata sandi awal minimal 8 karakter.", berhasil: null };
  }

  const supabase = await createClient();
  const { data: baris } = await supabase
    .from("pengguna")
    .select("nama, email, auth_user_id")
    .eq("id", penggunaId)
    .maybeSingle();

  if (!baris) return { pesan: "Anggota tidak ditemukan.", berhasil: null };
  if (baris.auth_user_id) {
    return { pesan: `${baris.nama} sudah punya akun login.`, berhasil: null };
  }

  const admin = createAdminClient();
  const { data: akun, error } = await admin.auth.admin.createUser({
    email: baris.email,
    password: sandi,
    email_confirm: true,
  });

  if (error) {
    return {
      pesan:
        error.message.includes("already been registered")
          ? `Email ${baris.email} sudah dipakai akun lain. Periksa lagi ejaannya.`
          : `Akun gagal dibuat: ${error.message}`,
      berhasil: null,
    };
  }

  // Menyambungkan akun yang baru dibuat ke baris penggunanya.
  //
  // Dikerjakan di sini, bukan oleh pemicu di auth.users, karena
  // membuat pemicu di skema `auth` butuh hak kepemilikan yang tidak
  // diberikan Supabase. Memakai koneksi admin sebab kolom ini tidak
  // boleh disentuh pengguna biasa.
  const { error: galatSambung } = await admin
    .from("pengguna")
    .update({ auth_user_id: akun.user.id })
    .eq("id", penggunaId);

  if (galatSambung) {
    return {
      pesan:
        `Akun untuk ${baris.nama} sudah dibuat, tetapi belum tersambung ke ` +
        `daftar anggota, jadi beliau belum bisa masuk. Jalankan ulang ` +
        `04_sambungkan_akun.sql di Supabase untuk menyambungkannya.`,
      berhasil: null,
    };
  }

  revalidatePath("/pengaturan/pengguna");
  return {
    pesan: null,
    berhasil: `Akun untuk ${baris.nama} sudah dibuat. Sampaikan kata sandi awalnya, lalu minta beliau menggantinya setelah masuk.`,
  };
}

/** Menambah anggota baru ke daftar. Akun loginnya dibuat menyusul. */
export async function tambahAnggota(_s: Hasil, formData: FormData): Promise<Hasil> {
  const galat = await pastikanAdmin();
  if (galat) return { pesan: galat, berhasil: null };

  const nama = String(formData.get("nama") ?? "").trim();
  const jabatan = String(formData.get("jabatan") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const peran = String(formData.get("peran") ?? "Staf");

  if (!nama || !jabatan || !email) {
    return { pesan: "Nama, jabatan, dan email harus diisi.", berhasil: null };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pengguna")
    .insert({ nama, jabatan, email, peran });

  if (error) {
    return {
      pesan: error.message.includes("duplicate")
        ? `Email ${email} sudah terdaftar.`
        : `Gagal menambah anggota: ${error.message}`,
      berhasil: null,
    };
  }

  revalidatePath("/pengaturan/pengguna");
  return { pesan: null, berhasil: `${nama} sudah ditambahkan.` };
}

/** Menonaktifkan atau mengaktifkan kembali seorang anggota. */
export async function ubahAktif(formData: FormData) {
  const galat = await pastikanAdmin();
  if (galat) return;

  const penggunaId = Number(formData.get("pengguna_id"));
  const jadikanAktif = formData.get("aktif") === "true";

  const supabase = await createClient();
  await supabase.from("pengguna").update({ aktif: jadikanAktif }).eq("id", penggunaId);

  revalidatePath("/pengaturan/pengguna");
}

/** Mengubah peran seorang anggota antara Admin dan Staf. */
export async function ubahPeran(formData: FormData) {
  const galat = await pastikanAdmin();
  if (galat) return;

  const penggunaId = Number(formData.get("pengguna_id"));
  const peran = String(formData.get("peran") ?? "Staf");

  const supabase = await createClient();
  await supabase.from("pengguna").update({ peran }).eq("id", penggunaId);

  revalidatePath("/pengaturan/pengguna");
}
