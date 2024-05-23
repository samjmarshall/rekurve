declare global {
  interface Window {
    dataLayer?: object[]
  }
}

interface GAEvent {
  event: string
  [key: string]: unknown
}

export function sendGAEvent(data: GAEvent) {
  if (window.dataLayer) {
    window.dataLayer.push(data)
  }
}