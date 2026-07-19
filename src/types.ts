/**
 * Type definitions for NIK Parser Application
 */

export interface NIKParseResponse {
  success: boolean;
  isFallback?: boolean;
  message?: string;
  data?: {
    // Standard response keys we normalize, or direct ones from the nexray api
    nik?: string;
    nik_valid?: boolean | string;
    provinsi?: string;
    kabupaten?: string;
    kabko?: string;
    kecamatan?: string;
    kelurahan?: string;
    kodepos?: string;
    kode_pos?: string;
    lahir?: string;
    tanggal_lahir?: string;
    tgl_lahir?: string;
    kelamin?: string;
    jenis_kelamin?: string;
    kodeprov?: string;
    kodekab?: string;
    kodekec?: string;
    uniqcode?: string;
    note?: string;
    
    // API specific keys if any
    status?: string;
    error?: string;
    
    // Coordinates
    latitude?: string | number;
    longitude?: string | number;
    lat?: string | number;
    lng?: string | number;
    lon?: string | number;
    coor?: string;
    koordinat?: string;
  };
}

export interface HistoryItem {
  id: string;
  nik: string;
  timestamp: string;
  provinsi: string;
  kabupaten: string;
  kecamatan: string;
}
