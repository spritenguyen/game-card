export const getDeviceInfo = () => {
  if (typeof window === "undefined") {
    return { isMobile: false, isIOS: false, isAndroid: false, isPC: true };
  }

  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  // Cập nhật isMobile bao gồm cả việc kiểm tra kích thước màn hình để đảm bảo responsive tốt hơn
  const isMobile =
    isIOS ||
    isAndroid ||
    /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    window.innerWidth <= 768;

  return {
    isMobile,
    isIOS,
    isAndroid,
    isPC: !isMobile,
  };
};

export const device = getDeviceInfo();
