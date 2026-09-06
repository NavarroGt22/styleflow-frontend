export type ClientCoords = { lat: number; lng: number }

export function getClientGeolocation(options?: PositionOptions): Promise<ClientCoords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Seu navegador não oferece localização. Use um celular ou outro browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new Error(
              'Permissão de localização negada. Ative o GPS nas configurações do navegador e tente de novo.'
            )
          )
          return
        }
        if (err.code === err.TIMEOUT) {
          reject(new Error('Tempo esgotado ao obter localização. Tente novamente mais perto da porta.'))
          return
        }
        reject(new Error('Não foi possível obter sua localização. Verifique se o GPS está ligado.'))
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30_000,
        ...options,
      }
    )
  })
}
