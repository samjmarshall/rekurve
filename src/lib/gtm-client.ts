declare global {
  interface Window {
    dataLayer?: object[]
  }
}

interface GTMEvent {
  event: string
  [key: string]: unknown
}

export function sendGTMEvent(data: GTMEvent) {
  if (window.dataLayer) {
    window.dataLayer.push(data)
  }
}