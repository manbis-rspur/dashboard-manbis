import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Alamat lama dari sebelum penomoran dijadikan modul tersendiri.
   * Tetap dilayani supaya penanda halaman yang terlanjur disimpan
   * orang tidak berujung di halaman kosong.
   */
  async redirects() {
    return [
      {
        source: "/ambil-nomor",
        destination: "/penomoran/ambil-nomor",
        permanent: false,
      },
      {
        source: "/buku-nomor",
        destination: "/penomoran/buku-nomor",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
