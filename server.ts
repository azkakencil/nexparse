import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to parse NIK
  app.get("/api/nikparse", async (req, res) => {
    const { nik } = req.query;

    if (!nik || typeof nik !== "string" || !/^\d{16}$/.test(nik)) {
      return res.status(400).json({
        success: false,
        message: "Format NIK tidak valid. Harus terdiri dari 16 digit angka.",
      });
    }

    try {
      console.log(`[API] Fetching NIK parse for: ${nik}`);
      const targetUrl = `https://api.nexray.eu.cc/tools/nikparse?nik=${nik}`;
      
      const response = await fetch(targetUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      let data: any = null;
      let isFallback = false;
      let message = "";

      if (response.ok) {
        data = await response.json();
        console.log(`[API] Raw response:`, JSON.stringify(data));
        
        if (data && data.status === false) {
          isFallback = true;
          message = data.error || "Pencarian wilayah spesifik tidak ditemukan di database online, menggunakan mesin analisis lokal.";
          data = parseNikLocal(nik);
        }
      } else {
        // Handle non-2xx statuses by attempting to parse JSON for helpful error info
        try {
          const errData = await response.json();
          console.log(`[API] Non-OK Raw response:`, JSON.stringify(errData));
          isFallback = true;
          message = errData.error || `Kesalahan database online (Status ${response.status}).`;
        } catch {
          isFallback = true;
          message = `Tidak dapat terhubung ke database online (Status ${response.status}).`;
        }
        data = parseNikLocal(nik);
      }

      return res.json({
        success: true,
        isFallback: isFallback,
        message: message || undefined,
        data: data,
      });
    } catch (error: any) {
      console.error("[API] Error fetching NIK parse:", error);
      
      // We will perform local parsing as a smart fallback if the API fails or is offline!
      // This ensures the website always works and has a beautiful backup!
      const fallbackData = parseNikLocal(nik);
      
      return res.json({
        success: true,
        isFallback: true,
        message: "API eksternal offline, menampilkan hasil analisis lokal.",
        data: fallbackData,
      });
    }
  });

  // Local NIK Parser Fallback Function
  function parseNikLocal(nik: string) {
    // 16 digits: PP.KK.KC.DDMMYY.UUUU
    const provCode = nik.substring(0, 2);
    const kabCode = nik.substring(0, 4);
    const kecCode = nik.substring(0, 6);
    
    let day = parseInt(nik.substring(6, 8), 10);
    const month = parseInt(nik.substring(8, 10), 10);
    let year = parseInt(nik.substring(10, 12), 10);

    const gender = day > 40 ? "Perempuan" : "Laki-laki";
    if (day > 40) {
      day -= 40;
    }

    // Standard Indonesian Year Logic
    const currentYear = new Date().getFullYear() % 100;
    const fullYear = year <= currentYear ? 2000 + year : 1900 + year;

    // Format Birthday
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const birthdayStr = (month >= 1 && month <= 12) 
      ? `${day} ${months[month - 1]} ${fullYear}`
      : `${day}/${month}/${fullYear}`;

    // Simple Prov / Kab maps just for local fallback presentation
    const provinceMap: Record<string, string> = {
      "11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau",
      "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung",
      "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta",
      "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur",
      "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur",
      "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan",
      "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara",
      "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara",
      "75": "Gorontalo", "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara",
      "91": "Papua", "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah",
      "95": "Papua Pegunungan"
    };

    const provinsi = provinceMap[provCode] || "Provinsi Tidak Diketahui (Kode " + provCode + ")";
    
    return {
      nik: nik,
      provinsi: provinsi,
      kabupaten: `Kabupaten/Kota (Kode ${kabCode})`,
      kecamatan: `Kecamatan (Kode ${kecCode})`,
      lahir: birthdayStr,
      kelamin: gender,
      kodepos: "Tidak diketahui",
      uniqcode: nik.substring(12, 16),
      note: "Data diparse secara lokal karena API eksternal sedang offline atau mengalami gangguan.",
    };
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
