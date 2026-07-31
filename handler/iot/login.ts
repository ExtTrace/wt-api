import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { supabase } from '../../lib/supabase';
import { handleCors } from '../../lib/cors';

export default async function handleLogin(
  req: VercelRequest,
  res: VercelResponse,
) {
  handleCors(req, res);
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST for authentication.',
    });
  }

  try {
    const { username, password } = req.body || {};

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username / ID Operator wajib diisi.',
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password akses sistem wajib diisi.',
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi server tidak lengkap. Hubungi administrator.',
      });
    }

    // Cari user berdasarkan username di tabel iot_users
    const { data: user, error } = await supabase
      .from('iot_users')
      .select('id, username, password_hash, full_name, role, is_active')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Kredensial tidak valid. Silakan periksa username & password.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun operator tidak aktif. Hubungi administrator.',
      });
    }

    // Validasi password menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Kredensial tidak valid. Silakan periksa username & password.',
      });
    }

    // Update last_login_at setelah berhasil autentikasi
    await supabase
      .from('iot_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    const sessionToken = `iot_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return res.status(200).json({
      success: true,
      message: 'Autentikasi operator berhasil.',
      token: sessionToken,
      user: {
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        authenticatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('IoT Login API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan internal pada server autentikasi IoT.',
    });
  }
}
