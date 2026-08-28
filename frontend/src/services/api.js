import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Oturumun bittiğini gösteren yanıtlar. Backend süresi dolmuş token'a 403 döndüğü için
// yalnızca status'e bakmak yetmez: 403 aynı zamanda "bu işleme yetkin yok" anlamına da
// gelir ve o durumda kullanıcı ASLA çıkışa zorlanmamalıdır. Ayrım code alanıyla yapılır
// (eski sürüm backend'lerde code gelmeyebileceği için mesaj metni yedek kontroldür).
const oturumBittiMi = (error) => {
  const status = error.response?.status;
  if (status === 401) return true;
  if (status !== 403) return false;
  const data = error.response?.data || {};
  if (data.code) return data.code === 'TOKEN_INVALID' || data.code === 'TOKEN_MISSING';
  return typeof data.message === 'string' && data.message.toLowerCase().includes('token');
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (oturumBittiMi(error)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Zaten login sayfasındaysak yeniden yönlendirip döngü oluşturma
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
  getUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  getYatirimcilar: () => api.get('/auth/yatirimcilar'),
  getPersonelListesi: () => api.get('/auth/personel-listesi'),
  approveUser: (id) => api.patch(`/auth/users/${id}/approve`),
  rejectUser: (id) => api.patch(`/auth/users/${id}/reject`),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  setAksesuarYetkisi: (id, yetkisi) => api.patch(`/auth/users/${id}/aksesuar-yetkisi`, { aksesuar_yetkisi: yetkisi }),
  setMotorSatisYetkisi: (id, yetkisi) => api.patch(`/auth/users/${id}/motor-satis-yetkisi`, { motor_satis_yetkisi: yetkisi }),
  setEticaretYetkisi: (id, yetkisi) => api.patch(`/auth/users/${id}/eticaret-yetkisi`, { eticaret_yetkisi: yetkisi }),
  setServisYetkisi: (id, yetkisi) => api.patch(`/auth/users/${id}/servis-yetkisi`, { servis_yetkisi: yetkisi }),
  setAksesuarStokYetkisi: (id, yetkisi) => api.patch(`/auth/users/${id}/aksesuar-stok-yetkisi`, { aksesuar_stok_yetkisi: yetkisi }),
  setYedekParcaYetkisi: (id, yetkisi) => api.patch(`/auth/users/${id}/yedek-parca-yetkisi`, { yedek_parca_yetkisi: yetkisi }),
  setYetkiler: (id, yetkiler) => api.patch(`/auth/users/${id}/yetkiler`, yetkiler),
  getActivityLogs: () => api.get('/auth/activity-logs'),
  getUserActivityLogs: (id) => api.get(`/auth/users/${id}/activity-logs`),
};

// Müşteriler
export const musteriService = {
  getAll: () => api.get('/musteriler'),
  getById: (id) => api.get(`/musteriler/${id}`),
  create: (data) => api.post('/musteriler', data),
  update: (id, data) => api.put(`/musteriler/${id}`, data),
  delete: (id) => api.delete(`/musteriler/${id}`),
  search: (query) => api.get(`/musteriler/ara/${query}`),
  searchByPhone: (telefon) => api.get(`/musteriler/telefon/${encodeURIComponent(telefon)}`),
};

// İş Emirleri
export const isEmriService = {
  getAll: (params) => api.get('/is-emirleri', { params }),
  getById: (id) => api.get(`/is-emirleri/${id}`),
  create: (data) => api.post('/is-emirleri', data),
  update: (id, data) => api.put(`/is-emirleri/${id}`, data),
  delete: (id) => api.delete(`/is-emirleri/${id}`),
  getNextFisNo: () => api.get('/is-emirleri/next-fis-no/preview'),
};

// Aksesuarlar
export const aksesuarService = {
  getAll: () => api.get('/aksesuarlar'),
  getById: (id) => api.get(`/aksesuarlar/${id}`),
  create: (data) => api.post('/aksesuarlar', data),
  update: (id, data) => api.put(`/aksesuarlar/${id}`, data),
  delete: (id) => api.delete(`/aksesuarlar/${id}`),
  getStats: () => api.get('/aksesuarlar/stats/genel'),
};

// Aksesuar Stok
export const aksesuarStokService = {
  getAll: () => api.get('/aksesuar-stok'),
  search: (q) => api.get('/aksesuar-stok/ara', { params: { q } }),
  getByBarkod: (kod) => api.get(`/aksesuar-stok/barkod/${encodeURIComponent(kod)}`),
  getNextStokKodu: () => api.get('/aksesuar-stok/next-stok-kodu'),
  create: (data) => api.post('/aksesuar-stok', data),
  update: (id, data) => api.put(`/aksesuar-stok/${id}`, data),
  delete: (id) => api.delete(`/aksesuar-stok/${id}`),
  topluEkle: (stoklar) => api.post('/aksesuar-stok/toplu', { stoklar }),
};

// 2. El Motor
export const ikinciElMotorService = {
  getAll: (params) => api.get('/ikinci-el-motor', { params }),
  getById: (id) => api.get(`/ikinci-el-motor/${id}`),
  create: (data) => api.post('/ikinci-el-motor', data),
  update: (id, data) => api.put(`/ikinci-el-motor/${id}`, data),
  delete: (id) => api.delete(`/ikinci-el-motor/${id}`),
  getStats: () => api.get('/ikinci-el-motor/stats/ozet'),
};

// E-Ticaret
export const eticaretService = {
  // Platformlar
  getPlatformlar: () => api.get('/eticaret/platformlar'),
  getPlatforms: () => api.get('/eticaret/platformlar'),
  createPlatform: (data) => api.post('/eticaret/platformlar', data),
  updatePlatform: (id, data) => api.put(`/eticaret/platformlar/${id}`, data),
  deletePlatform: (id) => api.delete(`/eticaret/platformlar/${id}`),
  // Satışlar
  getAll: () => api.get('/eticaret'),
  getSales: () => api.get('/eticaret'),
  getById: (id) => api.get(`/eticaret/${id}`),
  create: (data) => api.post('/eticaret', data),
  createSale: (data) => api.post('/eticaret', data),
  update: (id, data) => api.put(`/eticaret/${id}`, data),
  updateSale: (id, data) => api.put(`/eticaret/${id}`, data),
  delete: (id) => api.delete(`/eticaret/${id}`),
  deleteSale: (id) => api.delete(`/eticaret/${id}`),
  getStats: () => api.get('/eticaret/stats'),
};

// Yedek Parçalar
export const yedekParcaService = {
  getAll: () => api.get('/yedek-parcalar'),
  getById: (id) => api.get(`/yedek-parcalar/${id}`),
  create: (data) => api.post('/yedek-parcalar', data),
  update: (id, data) => api.put(`/yedek-parcalar/${id}`, data),
  delete: (id) => api.delete(`/yedek-parcalar/${id}`),
};

// Yedek Parça Stok
export const yedekParcaStokService = {
  getAll: () => api.get('/yedek-parca-stok'),
  search: (q) => api.get('/yedek-parca-stok/ara', { params: { q } }),
  getByBarkod: (kod) => api.get(`/yedek-parca-stok/barkod/${encodeURIComponent(kod)}`),
  getNextStokKodu: () => api.get('/yedek-parca-stok/next-stok-kodu'),
  create: (data) => api.post('/yedek-parca-stok', data),
  update: (id, data) => api.put(`/yedek-parca-stok/${id}`, data),
  delete: (id) => api.delete(`/yedek-parca-stok/${id}`),
  topluEkle: (stoklar) => api.post('/yedek-parca-stok/toplu', { stoklar }),
};

// Servis geçmişi (müşteri QR sayfası — token halka açık, oluşturma yetkili)
export const servisGecmisiService = {
  getByToken: (token) => api.get(`/servis-gecmisi/${encodeURIComponent(token)}`),
  getQrToken: (plaka) => api.post('/is-emirleri/qr-token', { plaka }),
};

// Raporlar
export const raporService = {
  getGunluk: (tarih) => api.get('/raporlar/gunluk', { params: { tarih } }),
  getAralik: (baslangic, bitis) => api.get('/raporlar/aralik', { params: { baslangic, bitis } }),
  getGenel: () => api.get('/raporlar/genel'),
  getFisKar: (baslangic, bitis) => api.get('/raporlar/fis-kar', { params: { baslangic, bitis } }),
  getPersoneller: () => api.get('/raporlar/personeller'),
  getYatirimciRapor: (params) => api.get('/raporlar/yatirimci-rapor', { params }),
  getYatirimciOzet: (baslangic, bitis) => api.get('/raporlar/yatirimci-ozet', { params: { baslangic, bitis } }),
};

// Veresiye (Açık borçlar)
export const veresiyeService = {
  getAll: () => api.get('/veresiye'),
};

// Vitrin (genel kullanıma açık mağaza)
export const vitrinService = {
  getAll: (params) => api.get('/vitrin', { params }),
  getAllAdmin: (params) => api.get('/vitrin', { params: { ...params, hepsi: 1 } }),
  getById: (id) => api.get(`/vitrin/${id}`),
  getIletisim: () => api.get('/vitrin/iletisim'),
  getSegmentler: () => api.get('/vitrin/segmentler'),
  addSegment: (ad) => api.post('/vitrin/segmentler', { ad }),
  create: (data) => api.post('/vitrin', data),
  update: (id, data) => api.put(`/vitrin/${id}`, data),
  reorder: (kategori, urunIds) => api.put('/vitrin/sirala', { kategori, urun_ids: urunIds }),
  setPublished: (id, yayinda) => api.patch(`/vitrin/${id}/yayin`, { yayinda }),
  moveToPosition: (id, sira) => api.patch(`/vitrin/${id}/sira`, { sira }),
  delete: (id) => api.delete(`/vitrin/${id}`),
  updateIletisim: (kategori, data) => api.put(`/vitrin/iletisim/${kategori}`, data),
  gorselUrl: (id) => `${API_URL}/vitrin/gorsel/${id}`,
  videoUrl: (id) => `${API_URL}/vitrin/video/${id}`,
  iletisimGorselUrl: (kategori) => `${API_URL}/vitrin/iletisim-gorsel/${kategori}`,
};

export default api;
