import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'

const app = `http://127.0.0.1:${Number(process.env.SUPPORT_TEST_PORT || 5310)}`
const id = '47070000-abcd-4000-8000-000000000001'

test('a bootstrap failure allows ending the identified session and retrying a failed revocation', async () => {
  const modulePath = process.env.PLAYWRIGHT_MODULE_PATH
  const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright')
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  try {
    const page = await browser.newPage({ serviceWorkers: 'block' })
    page.setDefaultTimeout(60_000)
    await page.addInitScript(origin => {
      if (location.origin !== origin) return
      sessionStorage.setItem('token', 'normal-local-token')
      sessionStorage.setItem('adminAuthenticatedAt', String(Date.now()))
      sessionStorage.setItem('user', JSON.stringify({
        role: 'PROFESSIONAL', professionalProfile: { salon: { slug: 'barbearia-normal' } },
        salons: [{ slug: 'outra-unidade' }],
      }))
    }, app)
    let attempts = 0
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin !== app) return route.abort()
      if (url.pathname === '/api/support/session') {
        return route.fulfill({ status: 403, json: { error: 'Acesso operacional indisponível.' } })
      }
      if (url.pathname === '/api/support/end') {
        assert.equal(route.request().method(), 'POST')
        assert.equal(route.request().headers()['x-support-session-id'], id)
        attempts++
        return attempts === 1
          ? route.fulfill({ status: 502, json: { error: 'Falha temporária ao encerrar.' } })
          : route.fulfill({ json: { ended: true } })
      }
      if (url.pathname === '/admin/barbearia-normal') {
        if (url.searchParams.has('_rsc')) return route.continue()
        return route.fulfill({ contentType: 'text/html', body: '<main>Painel normal</main>' })
      }
      return route.continue()
    })
    await page.goto(app + '/support?session=' + id)
    await page.getByText('Acesso operacional indisponível.').waitFor()
    const endButton = page.getByRole('button', { name: 'Encerrar suporte' })
    assert.equal(await endButton.isVisible(), true)
    await endButton.click()
    await page.getByText('Falha temporária ao encerrar.').waitFor()
    assert.equal(new URL(page.url()).pathname, '/support')
    await endButton.click()
    await page.waitForURL(app + '/admin/barbearia-normal')
    assert.equal(attempts, 2)
  } finally {
    await browser.close()
  }
})
