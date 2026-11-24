import { looksIndonesian } from '../src/lib/indonesian-text.js';

describe('looksIndonesian', () => {
  it.each([
    'Kenapa Bank di Indonesia Jadi Target Serangan Siber? Ini Kata Pakar',
    'PENYEBAB KEBOCORAN DATA PEMERINTAH',
    'Lazarus Group diduga mencuri miliaran dolar lewat serangan siber. #Shorts',
    'Bank Arunika & Nasabah Ulasan',
    'ransomware',
  ])('keeps Indonesian or undecidable text: %s', (t) => expect(looksIndonesian(t)).toBe(true));

  it.each([
    'Malware Explained | Viruses, Trojans, Ransomware, And Stealers.',
    'Ransomware no Proxmox: a senha root tava num bloco de notas',
    'Ransomware gangs run like a franchise',
    'Is your Azure VM actually secure? #azure #ransomware',
    'How Ransomware Gangs Actually Operate: From Break-In to Leak Site',
  ])('drops foreign-language text: %s', (t) => expect(looksIndonesian(t)).toBe(false));
});
