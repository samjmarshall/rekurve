declare global {
  interface Window {
    dataLayer?: object[]
    [key: string]: unknown
  }
}

export const sendGTMEvent = (data: object) => {
  if (window.dataLayer) {
    window.dataLayer.push(data)
  }
}
