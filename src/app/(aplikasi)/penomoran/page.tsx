import { redirect } from "next/navigation";

/**
 * Modul penomoran tidak punya halaman muka sendiri — begitu dibuka,
 * langsung ke pekerjaan yang paling sering dilakukan.
 */
export default function Penomoran() {
  redirect("/penomoran/ambil-nomor");
}
