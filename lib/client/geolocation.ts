export type ClientCoords = { lat: number; lng: number }

export function getClientGeolocation(options?: PositionOptions): Promise<ClientCoords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Seu navegador não oferece localização. Use um celular ou outro browser.'))
      return
    }

    const tryOnce = (opts: PositionOptions, onFail: (err: GeolocationPositionError) => void) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        onFail,
        opts
      )
    }

    // 1º tentativa: alta precisão. Se falhar (comum em indoor), tenta sem high accuracy.
    tryOnce(
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30_000,
        ...options,
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
        tryOnce(
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60_000,
            ...options,
          },
          (err2) => {
            if (err2.code === err2.PERMISSION_DENIED) {
              reject(
                new Error(
                  'Permissão de localização negada. Ative o GPS nas configurações do navegador e tente de novo.'
                )
              )
              return
            }
            if (err2.code === err2.TIMEOUT) {
              reject(new Error('Tempo esgotado ao obter localização. Tente novamente mais perto da porta ou na rua.'))
              return
            }
            reject(new Error('Não foi possível obter sua localização. Verifique se o GPS está ligado.'))
          }
        )
      }
    )
  })
}
