/**
 * Tek geri bildirim hareketi: yanlış cevapta oturumun kısa sarsıntısı.
 *
 * Kıvılcım, ışık süpürmesi, ısı halesi ve kenar parlaması kaldırıldı.
 * Doğru cevabın karşılığı artık ses, kısa titreşim ve seçeneğin kendi renk
 * geçişi; her doğruda ekranda gösteri yapmak soruyu gölgeliyordu.
 *
 * `prefers-reduced-motion` açıksa sarsıntı da çalışmaz.
 */
export function shake(target: Element | null | undefined): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!target) return;
  const el = target as HTMLElement;
  el.classList.remove('fx-shake');
  // Sınıfı yeniden başlatmak için bir kare bekle.
  void el.offsetWidth;
  el.classList.add('fx-shake');
  window.setTimeout(() => el.classList.remove('fx-shake'), 420);
}
