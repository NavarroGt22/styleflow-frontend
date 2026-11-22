import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseMoneyInput, moneyInput, nextMonth } from '../lib/platform/money.ts'
test('converts decimal input with integer cents and no floating point accumulation', () => {
  assert.equal(parseMoneyInput('110,00'), 11000); assert.equal(parseMoneyInput('0.10') + parseMoneyInput('0.20'), 30); assert.equal(moneyInput(22000), '220.00')
  for (const value of ['1.001', '1e5', '-5', '0', '1,00,00', '99999999.99']) assert.throws(() => parseMoneyInput(value))
})
test('moves advance allocations across calendar years', () => { assert.equal(nextMonth('2026-12'), '2027-01'); assert.throws(() => nextMonth('2026-13')) })
