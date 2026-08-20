import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '../shared/types'

const api: Api = {
  ref: {
    meta: () => ipcRenderer.invoke('ref:meta'),
    import: (dataDir, asOf) => ipcRenderer.invoke('ref:import', dataDir, asOf),
    items: (q, divisi, limit) => ipcRenderer.invoke('ref:items', q, divisi, limit),
    parents: () => ipcRenderer.invoke('ref:parents'),
    item: (kode) => ipcRenderer.invoke('ref:item', kode),
    master: (q, jenis) => ipcRenderer.invoke('ref:master', q, jenis),
    masterBulk: (items) => ipcRenderer.invoke('ref:masterBulk', items),
    besi: () => ipcRenderer.invoke('ref:besi'),
  },
  projek: {
    list: () => ipcRenderer.invoke('projek:list'),
    create: (nama, klien, lokasi, deskripsi) => ipcRenderer.invoke('projek:create', nama, klien, lokasi, deskripsi),
    update: (id, data) => ipcRenderer.invoke('projek:update', id, data),
    remove: (id) => ipcRenderer.invoke('projek:remove', id),
    setting: (projekId) => ipcRenderer.invoke('projek:setting', projekId),
    saveSetting: (projekId, data) => ipcRenderer.invoke('projek:saveSetting', projekId, data),
  },
  rab: {
    list: (projekId) => ipcRenderer.invoke('rab:list', projekId),
    meta: (rabId) => ipcRenderer.invoke('rab:meta', rabId),
    setPpn: (rabId, ppnPct) => ipcRenderer.invoke('rab:setPpn', rabId, ppnPct),
    create: (projekId, nama) => ipcRenderer.invoke('rab:create', projekId, nama),
    remove: (id) => ipcRenderer.invoke('rab:remove', id),
    items: (rabId) => ipcRenderer.invoke('rab:items', rabId),
    addItem: (rabId, kode, volume) => ipcRenderer.invoke('rab:addItem', rabId, kode, volume),
    addUserItem: (rabId, parentId, uraian, satuan, volume) =>
      ipcRenderer.invoke('rab:addUserItem', rabId, parentId, uraian, satuan, volume),
    updateItem: (id, data) => ipcRenderer.invoke('rab:updateItem', id, data),
    removeItem: (id) => ipcRenderer.invoke('rab:removeItem', id),
    hitung: (rabId) => ipcRenderer.invoke('rab:hitung', rabId),
    bom: (rabId) => ipcRenderer.invoke('rab:bom', rabId),
    setHargaKomponen: (rabId, jenis, uraian, harga) => ipcRenderer.invoke('rab:setHargaKomponen', rabId, jenis, uraian, harga),
    volumes: (rabId) => ipcRenderer.invoke('rab:volumes', rabId),
    addVolume: (rabItemId, uraian, panjang, lebar, tinggi, jumlah) =>
      ipcRenderer.invoke('rab:addVolume', rabItemId, uraian, panjang, lebar, tinggi, jumlah),
    updateVolume: (id, data) => ipcRenderer.invoke('rab:updateVolume', id, data),
    removeVolume: (id) => ipcRenderer.invoke('rab:removeVolume', id),
    tulangan: (rabVolumeId) => ipcRenderer.invoke('rab:tulangan', rabVolumeId),
    addTulangan: (rabVolumeId, posisi, jenis, diameter, jumlah, panjang) =>
      ipcRenderer.invoke('rab:addTulangan', rabVolumeId, posisi, jenis, diameter, jumlah, panjang),
    updateTulangan: (id, data) => ipcRenderer.invoke('rab:updateTulangan', id, data),
    removeTulangan: (id) => ipcRenderer.invoke('rab:removeTulangan', id),
    profiles: (rabId) => ipcRenderer.invoke('rab:profiles', rabId),
    addProfile: (rabId, data) => ipcRenderer.invoke('rab:addProfile', rabId, data),
    updateProfile: (id, data) => ipcRenderer.invoke('rab:updateProfile', id, data),
    removeProfile: (id) => ipcRenderer.invoke('rab:removeProfile', id),
    profilTulangan: (rabProfilId) => ipcRenderer.invoke('rab:profilTulangan', rabProfilId),
    addProfilTulangan: (rabProfilId, posisi, jenis, diameter, jumlah, panjang) =>
      ipcRenderer.invoke('rab:addProfilTulangan', rabProfilId, posisi, jenis, diameter, jumlah, panjang),
    updateProfilTulangan: (id, data) => ipcRenderer.invoke('rab:updateProfilTulangan', id, data),
    removeProfilTulangan: (id) => ipcRenderer.invoke('rab:removeProfilTulangan', id),
    jadwal: (rabId) => ipcRenderer.invoke('rab:jadwal', rabId),
    jadwalUpdate: (id, data) => ipcRenderer.invoke('rab:jadwalUpdate', id, data),
    dependensi: (jadwalId) => ipcRenderer.invoke('rab:dependensi', jadwalId),
    addDependensi: (jadwalId, predJadwalId) => ipcRenderer.invoke('rab:addDependensi', jadwalId, predJadwalId),
    removeDependensi: (id) => ipcRenderer.invoke('rab:removeDependensi', id),
  },
  report: {
    pdf: (html, defaultName) => ipcRenderer.invoke('report:pdf', html, defaultName),
  },
  komponen: {
    search: (q, jenis, limit) => ipcRenderer.invoke('komponen:search', q, jenis, limit),
    create: (data) => ipcRenderer.invoke('komponen:create', data),
  },
  analisa: {
    list: () => ipcRenderer.invoke('analisa:list'),
    get: (id) => ipcRenderer.invoke('analisa:get', id),
    save: (data) => ipcRenderer.invoke('analisa:save', data),
    remove: (id) => ipcRenderer.invoke('analisa:remove', id),
    addToRab: (rabId, analisaId, volume) => ipcRenderer.invoke('analisa:addToRab', rabId, analisaId, volume),
  },
}

contextBridge.exposeInMainWorld('api', api)
