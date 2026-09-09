import Link from "next/link";

export default function TanpaAkses() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold">Halaman ini khusus Admin</h1>
        <p className="mt-2 text-tinta-2">
          Pengaturan kode dan daftar pengguna hanya bisa dibuka oleh Koordinator
          Manajemen Bisnis. Kalau Anda perlu mengubah sesuatu di sana, hubungi
          beliau.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-hijau px-4 py-2.5 font-medium text-white"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
