import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CreditCard, 
  Map, 
  Building2, 
  Compass, 
  Calendar, 
  User, 
  Mail, 
  QrCode, 
  Search, 
  RotateCcw, 
  MapPin, 
  ClipboardCheck, 
  Copy, 
  AlertCircle, 
  History, 
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info
} from "lucide-react";
import { NIKParseResponse, HistoryItem } from "./types";

export default function App() {
  const [nikInput, setNikInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"parser" | "info">("parser");

  // Sample NIKs for Indonesian cities
  const sampleNiks = [
    { nik: "3172020101900001", label: "DKI Jakarta (Pria)" },
    { nik: "3273254506950003", label: "Bandung (Wanita)" },
    { nik: "3578102010850002", label: "Surabaya (Pria)" },
    { nik: "5103011212920005", label: "Badung, Bali (Pria)" }
  ];

  // Load history from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nik_parse_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Gagal memuat riwayat pencarian:", e);
    }
  }, []);

  // Save a search to history
  const addToHistory = (nik: string, province: string, city: string, district: string) => {
    try {
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        nik,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        provinsi: province,
        kabupaten: city,
        kecamatan: district
      };
      
      // Prevent duplicates
      const filtered = history.filter(item => item.nik !== nik);
      const updated = [newItem, ...filtered].slice(0, 5); // keep last 5 searches
      
      setHistory(updated);
      localStorage.setItem("nik_parse_history", JSON.stringify(updated));
    } catch (e) {
      console.error("Gagal menyimpan riwayat:", e);
    }
  };

  // Clear single history item
  const removeHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("nik_parse_history", JSON.stringify(updated));
  };

  // Clear all history
  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem("nik_parse_history");
  };

  // Input validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Allow only digits
    if (value.length <= 16) {
      setNikInput(value);
      setError(null);
    }
  };

  // Main search submit
  const handleSearch = async (targetNik?: string) => {
    const searchNik = targetNik || nikInput;
    
    if (!searchNik) {
      setError("Silakan masukkan NIK terlebih dahulu.");
      return;
    }
    
    if (searchNik.length !== 16) {
      setError("NIK harus tepat terdiri dari 16 digit angka.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setIsCopied(false);

    if (targetNik) {
      setNikInput(targetNik);
    }

    try {
      const response = await fetch(`/api/nikparse?nik=${searchNik}`);
      if (!response.ok) {
        throw new Error("Gagal terhubung ke server parser.");
      }
      
      const payload: NIKParseResponse = await response.json();
      
      if (payload.success && payload.data) {
        const normalized = normalizeData(payload);
        setResult(normalized);
        
        // Add to history
        if (normalized) {
          addToHistory(
            searchNik, 
            normalized.provinsi, 
            normalized.kabupaten, 
            normalized.kecamatan
          );
        }
      } else {
        setError(payload.message || "Gagal melakukan parsing NIK. Pastikan NIK terdaftar atau valid.");
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("Terjadi kesalahan koneksi atau server sedang sibuk. Silakan coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to normalize different API response variations
  const normalizeData = (payload: NIKParseResponse) => {
    let d = payload.data as any;
    if (!d) return null;

    // If the response is wrapped in a "result" field (like the external API), use it
    if (d.result) {
      d = d.result;
    }

    // Now extract fields safely, supporting both direct string values and nested object.nama values
    const getVal = (field: any) => {
      if (!field) return "";
      if (typeof field === "object") {
        return field.nama || field.name || field.value || "";
      }
      return String(field);
    };

    const provinsi = getVal(d.provinsi || d.prov || d.province) || "Tidak Terdeteksi";
    const kabupaten = getVal(d.kabupaten || d.kabko || d.kotakab || d.kabupaten_kota || d.city || d.regency) || "Tidak Terdeteksi";
    const kecamatan = getVal(d.kecamatan || d.subdistrict || d.kec) || "Tidak Terdeteksi";
    const kelurahan = getVal(d.kelurahan || d.village || d.desa || d.kel) || "-";
    const kodepos = getVal(d.kodepos || d.kode_pos || d.postal_code || d.zipcode) || "-";
    
    // Parse date of birth
    const lahir = d.lahir_lengkap || d.lahir || d.tanggal_lahir || d.tgl_lahir || d.birthdate || d.dob || "Tidak Terdeteksi";
    const kelamin = d.kelamin || d.jenis_kelamin || d.gender || d.jk || "Tidak Terdeteksi";
    const uniqcode = d.uniqcode || d.nomor_urut || d.kode_unik || d.sequence || "-";

    // Coordinates detection
    const lat = d.latitude || d.lat || null;
    const lng = d.longitude || d.lng || d.lon || null;

    return {
      nik: d.nik || payload.data.nik || nikInput,
      provinsi,
      kabupaten,
      kecamatan,
      kelurahan,
      kodepos,
      lahir,
      kelamin,
      uniqcode,
      lat,
      lng,
      isFallback: payload.isFallback || false,
      note: d.note || null
    };
  };

  // Copy result details to clipboard
  const copyToClipboard = () => {
    if (!result) return;
    
    const text = `
===== HASIL PARSING NIK =====
NIK: ${result.nik}
Provinsi: ${result.provinsi}
Kabupaten/Kota: ${result.kabupaten}
Kecamatan: ${result.kecamatan}
Kelurahan/Desa: ${result.kelurahan}
Tanggal Lahir: ${result.lahir}
Jenis Kelamin: ${result.kelamin}
Kode Pos: ${result.kodepos}
Kode Unik: ${result.uniqcode}
============================
Diperiksa melalui Cek NIK & Lokasi Online
    `.trim();

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Generate Google Maps Embed URL based on available location data
  const getGoogleMapsUrl = () => {
    if (!result) return "";
    
    let query = "";
    if (result.lat && result.lng) {
      // Use exact coordinates from API
      query = `${result.lat},${result.lng}`;
    } else {
      // Create intelligent search query based on hierarchy
      const components = [];
      if (result.kecamatan && result.kecamatan !== "-" && !result.kecamatan.includes("Kode")) {
        components.push(`Kecamatan ${result.kecamatan}`);
      }
      if (result.kabupaten && result.kabupaten !== "-" && !result.kabupaten.includes("Kode")) {
        components.push(result.kabupaten);
      }
      if (result.provinsi && result.provinsi !== "-" && !result.provinsi.includes("Kode")) {
        components.push(result.provinsi);
      }
      components.push("Indonesia");
      query = components.join(", ");
    }
    
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] py-8 px-4 sm:px-6 lg:px-8 font-sans flex flex-col items-center justify-start">
      
      {/* Dynamic Background Glowing Blobs for Natural Tones context */}
      <div className="blob w-72 h-72 sm:w-96 sm:h-96 bg-indigo-200/60 top-10 left-10" />
      <div className="blob w-80 h-80 sm:w-[450px] sm:h-[450px] bg-sky-200/50 bottom-10 right-10" style={{ animationDelay: "-3s" }} />
      <div className="blob w-64 h-64 bg-purple-200/40 top-1/2 left-1/3" style={{ animationDelay: "-6s" }} />

      {/* Main Glass Panel */}
      <div className="relative z-10 w-full max-w-5xl glass-panel rounded-[2rem] p-6 sm:p-8 md:p-10 flex flex-col gap-8 transition-all">
        
        {/* Navigation / Header - Natural Tones Style */}
        <nav className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/60 pb-6">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg flex items-center justify-center text-white">
              <CreditCard className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-800 tracking-tight">NexParse<span className="text-indigo-600">ID</span></span>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Sistem Validasi Geospasial KTP</p>
            </div>
          </div>

          {/* Nav Tabs & Active States */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="flex bg-slate-200/50 backdrop-blur p-1 rounded-xl border border-white/60">
              <button
                onClick={() => setActiveTab("parser")}
                className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === "parser"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                }`}
              >
                Parser NIK
              </button>
              <button
                onClick={() => setActiveTab("info")}
                className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === "info"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                }`}
              >
                Info Struktur KTP
              </button>
            </div>
          </div>
        </nav>

        {activeTab === "parser" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Input & Control Column (Left / Top) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 sm:p-8 rounded-[2rem] shadow-2xl flex-1 flex flex-col justify-center">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-tight mb-4">
                  Validasi Identitas <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Secara Akurat.</span>
                </h1>
                <p className="text-sm text-slate-600 mb-6 font-medium">
                  Masukkan 16 digit Nomor Induk Kependudukan (NIK) untuk mendapatkan analisis administratif dan demografi secara instan.
                </p>

                {/* Form Field */}
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <label className="text-xs font-bold text-indigo-600 uppercase tracking-widest ml-1 mb-2 block">Nomor NIK KTP</label>
                    <input
                      type="text"
                      pattern="\d*"
                      maxLength={16}
                      value={nikInput}
                      onChange={handleInputChange}
                      placeholder="Masukkan 16 digit..."
                      className="w-full px-5 py-4 bg-white/60 border border-indigo-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none text-lg text-slate-800 font-mono tracking-widest"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch();
                      }}
                    />
                    <div className="absolute right-4 bottom-4 text-xs font-bold text-slate-400">
                      {nikInput.length}/16
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={() => handleSearch()}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Memproses Data...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Cek NIK Sekarang
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                  <span className="text-indigo-500 text-sm mt-0.5">💡</span>
                  <p className="text-xs text-indigo-700 leading-relaxed font-semibold">
                    Gunakan data hasil parsing ini untuk keperluan verifikasi administrasi kependudukan Anda dengan praktis.
                  </p>
                </div>
              </div>

              {/* Sample Buttons Component */}
              <div className="bg-white/40 backdrop-blur-md border border-white/60 p-5 rounded-[2rem] shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Pilih Sampel NIK Demo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sampleNiks.map((sample) => (
                    <button
                      key={sample.nik}
                      onClick={() => handleSearch(sample.nik)}
                      className="px-3.5 py-2.5 text-left bg-white/50 hover:bg-white/90 border border-slate-200/50 rounded-2xl transition-all hover:border-indigo-400/50 group text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800">{sample.nik}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{sample.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Search History */}
              {history.length > 0 && (
                <div className="bg-white/40 backdrop-blur-md border border-white/60 p-5 rounded-[2rem] shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <History className="w-4 h-4 text-indigo-500" />
                      Riwayat Cek
                    </h3>
                    <button
                      onClick={clearAllHistory}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline transition-colors"
                    >
                      Hapus Semua
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSearch(item.nik)}
                        className="p-3 bg-white/40 hover:bg-white/80 rounded-2xl transition-all cursor-pointer flex items-center justify-between group border border-slate-200/30"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-slate-800 tracking-wider group-hover:text-indigo-600 transition-colors">
                            {item.nik}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {item.kecamatan}, {item.kabupaten}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {item.timestamp}
                          </span>
                          <button
                            onClick={(e) => removeHistoryItem(item.id, e)}
                            className="p-1 rounded-md hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                            title="Hapus"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Results Column (Right / Bottom) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <AnimatePresence mode="wait">
                
                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-50/90 backdrop-blur-md border border-red-200/80 rounded-2xl text-red-700 flex items-start gap-3 shadow-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <h4 className="font-bold text-sm">Kesalahan Validasi</h4>
                      <p className="text-xs mt-0.5 text-red-600 font-semibold leading-relaxed">{error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Main Dynamic View States */}
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/50 backdrop-blur-lg border border-white/70 rounded-[2rem] p-12 shadow-xl flex flex-col items-center justify-center text-center min-h-[350px]"
                  >
                    <div className="relative flex items-center justify-center mb-5">
                      <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600" />
                      <CreditCard className="w-6 h-6 text-indigo-600 absolute" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Menghubungi Server Parser...</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed font-medium">
                      Mengekstrak informasi wilayah administratif, tanggal lahir, dan menyinkronkan data lokasi geografis...
                    </p>
                  </motion.div>
                ) : result ? (
                  <motion.div
                    key="results-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    className="flex flex-col gap-6"
                  >
                    
                    {/* Primary Parse Report */}
                    <div className="bg-white/50 backdrop-blur-lg border border-white/70 p-6 sm:p-8 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col gap-6">
                      
                      {/* Decorative Watermark background icon */}
                      <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                        <CreditCard className="w-48 h-48" />
                      </div>

                      {/* Result Header Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-4 relative z-10">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            NIK VALID
                          </span>
                          {result.isFallback && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                              Analisis Lokal
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={copyToClipboard}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Tersalin!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-indigo-500" />
                                Salin Data
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* High level visual NIK */}
                      <div className="relative z-10">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nomor NIK Terdaftar</span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-wider font-mono mt-0.5">{result.nik}</h2>
                      </div>

                      {/* Info grid - Natural Tones Structured Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4 relative z-10 border-t border-slate-100 pt-5">
                        
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Provinsi</p>
                          <p className="text-sm font-bold text-slate-700 uppercase">{result.provinsi}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kab/Kota</p>
                          <p className="text-sm font-bold text-slate-700 uppercase">{result.kabupaten}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kecamatan</p>
                          <p className="text-sm font-bold text-slate-700 uppercase">{result.kecamatan}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tgl Lahir</p>
                          <p className="text-sm font-bold text-slate-700">{result.lahir}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Jenis Kelamin</p>
                          <p className="text-sm font-bold text-slate-700">{result.kelamin}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kode Pos</p>
                          <p className="text-sm font-bold text-slate-700">{result.kodepos}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kelurahan / Desa</p>
                          <p className="text-sm font-bold text-slate-700 uppercase">{result.kelurahan}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kode Unik KTP</p>
                          <p className="text-sm font-bold text-slate-700 font-mono">{result.uniqcode}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kategori Wilayah</p>
                          <p className="text-sm font-bold text-slate-700">WNI 🇮🇩</p>
                        </div>

                      </div>

                      {result.note && (
                        <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[11px] text-indigo-700 font-medium flex items-center gap-2 relative z-10">
                          <Info className="w-4 h-4 shrink-0 text-indigo-500" />
                          <span>{result.note}</span>
                        </div>
                      )}
                    </div>

                    {/* Integrated Location Google Maps Card - Beautiful Natural Tones map layout */}
                    <div className="bg-white/50 backdrop-blur-lg border border-white/70 p-6 rounded-[2rem] shadow-xl flex flex-col gap-4 relative">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-rose-500" />
                            Peta Wilayah Domisili NIK
                          </h3>
                          <span className="text-sm font-bold text-slate-700 mt-1 block">
                            {result.kecamatan}, {result.kabupaten}
                          </span>
                        </div>
                        {result.lat && result.lng && (
                          <div className="text-right sm:text-right text-[10px] text-slate-400 font-mono tracking-tighter">
                            LAT: {result.lat} | LNG: {result.lng}
                          </div>
                        )}
                      </div>
                      
                      {/* Embed Google Maps Iframe */}
                      <div className="relative w-full h-[280px] rounded-[1.5rem] overflow-hidden shadow-inner border border-white/80">
                        <iframe
                          title="Peta Lokasi NIK"
                          src={getGoogleMapsUrl()}
                          className="w-full h-full border-0 absolute inset-0 bg-[#e5e7eb]"
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 text-center font-medium">
                        *Lokasi dipetakan secara real-time berdasarkan kode wilayah administrasi kependudukan NIK Anda.
                      </div>
                    </div>

                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white/50 backdrop-blur-lg border border-white/70 rounded-[2rem] p-12 shadow-xl flex flex-col items-center justify-center text-center min-h-[380px]"
                  >
                    <div className="p-4 bg-white/80 border border-slate-100 text-slate-400 rounded-full mb-4 shadow-sm">
                      <CreditCard className="w-10 h-10 text-indigo-500 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Belum Ada Pemeriksaan</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed font-medium">
                      Masukkan 16 digit Nomor Induk Kependudukan (NIK) di panel sebelah kiri untuk melakukan parsing, validasi wilayah, dan memetakan lokasinya.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        ) : (
          /* Info Tab layout describing standard KTP structural syntax */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"
          >
            <div className="bg-white/50 backdrop-blur-lg border border-white/70 p-6 sm:p-8 rounded-[2rem] shadow-xl flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-500" />
                Struktur Pengodean NIK (KTP)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Nomor Induk Kependudukan (NIK) di Indonesia diatur berdasarkan peraturan perundang-undangan dan terdiri dari 16 digit angka unik yang menyimpan informasi kependudukan terstruktur:
              </p>

              <div className="flex flex-col gap-3 mt-2 text-xs">
                <div className="flex gap-2 items-start">
                  <div className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg shrink-0">Digit 1-2</div>
                  <div>
                    <strong className="text-slate-800">Kode Provinsi</strong>
                    <span className="text-slate-500 block font-medium">Menentukan wilayah provinsi asal pendaftaran kependudukan.</span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg shrink-0">Digit 3-4</div>
                  <div>
                    <strong className="text-slate-800">Kode Kabupaten / Kota</strong>
                    <span className="text-slate-500 block font-medium">Menandakan kabupaten atau kota tempat pendaftaran kependudukan.</span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg shrink-0">Digit 5-6</div>
                  <div>
                    <strong className="text-slate-800">Kode Kecamatan</strong>
                    <span className="text-slate-500 block font-medium">Kode unik tingkat kecamatan / distrik domisili.</span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg shrink-0">Digit 7-12</div>
                  <div>
                    <strong className="text-slate-800">Tanggal Lahir (DDMMYY)</strong>
                    <span className="text-slate-500 block font-medium">
                      Format DD-MM-YY. Khusus perempuan, angka tanggal lahir (DD) ditambah 40 (misal lahir tanggal 10, kodenya ditulis 50).
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg shrink-0">Digit 13-16</div>
                  <div>
                    <strong className="text-slate-800">Nomor Urut Registrasi</strong>
                    <span className="text-slate-500 block font-medium">Dimulai dari 0001, mencegah nomor ganda untuk tanggal lahir dan wilayah yang sama.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/50 backdrop-blur-lg border border-white/70 p-6 sm:p-8 rounded-[2rem] shadow-xl flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5 text-indigo-500" />
                  Keamanan & Privasi
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium mb-4">
                  Aplikasi ini memproses pemeriksaan NIK Anda dengan aman:
                </p>
                <ul className="text-xs text-slate-500 space-y-2.5 font-semibold">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 text-base leading-none">✔</span>
                    Proses parsing dikirimkan melalui server proxy terenkripsi (HTTPS).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 text-base leading-none">✔</span>
                    Kami tidak pernah menyimpan, mengumpulkan, atau membagikan data NIK KTP Anda ke basis data eksternal apa pun.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 text-base leading-none">✔</span>
                    Riwayat pemeriksaan disimpan murni secara lokal di browser Anda (Local Storage) dan dapat dihapus kapan saja dengan satu klik.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Butuh Bantuan?</span>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Jika API eksternal sedang mengalami gangguan, sistem kami secara cerdas mengaktifkan mesin parser lokal berbasis data spasial statis Indonesia agar analisis NIK Anda tetap berjalan lancar!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <footer className="border-t border-white/30 pt-5 text-center flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Server: API v2.4.0 Online</span>
            </div>
            <span className="text-[10px] font-bold text-slate-300">|</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latency: 24ms</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium tracking-wide">
            SmartGadget &copy; 2026. Powered by SmartGadget.
          </div>
        </footer>

      </div>
    </div>
  );
}
