function renderKrakenCharts () {
  disconnectKrakenLive()

  const main = document.querySelector('main')
  main.innerHTML = ''
  document.title = 'Kraken: ' + params.crypto + '-' + params.currency

  const divisor = Math.max(1, Math.floor(window.innerWidth / 500))
  const dim = dimension()
  const chartWidth = (window.innerWidth - (dim.margin.left + dim.margin.right)) / divisor
  const interval = params.interval
    ? Number(params.interval)
    : resolveInterval(params.res, params.agg)

  const promises = []

  params.crypto.split(',').forEach(function (ticker) {
    const symbol = ticker.trim()
    if (!symbol) {
      return
    }
    promises.push(
      chart(`chart-${symbol}`, symbol, params.currency, chartWidth, 350)
        .catch(error => {
          console.log('chart().catch', error.message)
          return null
        })
    )
  })

  Promise.all(promises).then(function (symbols) {
    const liveSymbols = symbols.filter(Boolean)
    if (liveSymbols.length > 0) {
      connectKrakenLive(liveSymbols, interval)
    }
  })
}

function applyKrakenParams (nextParams) {
  params = Object.assign({}, kraken.defaults, pickKrakenParams(nextParams))
  params.api = params.api || kraken.defaultApi
  saveKrakenParams(params)
  clearKrakenParamsFromUrl()
  renderKrakenCharts()
}

function aggOptionsForRes (res) {
  switch (res) {
    case 'hour':
      return [
        { value: '1', label: '1 hour (60m)' },
        { value: '4', label: '4 hours (240m)' }
      ]
    case 'day':
      return [{ value: '1', label: '1 day (1440m)' }]
    case 'minute':
    default:
      return [
        { value: '1', label: '1 minute' },
        { value: '5', label: '5 minutes' },
        { value: '15', label: '15 minutes' },
        { value: '30', label: '30 minutes' },
        { value: '60', label: '60 minutes' }
      ]
  }
}

function fillAggSelect (select, res, selected) {
  select.innerHTML = ''
  aggOptionsForRes(res).forEach(function (option) {
    const el = document.createElement('option')
    el.value = option.value
    el.textContent = option.label
    select.appendChild(el)
  })
  if ([...select.options].some((option) => option.value === String(selected))) {
    select.value = String(selected)
  }
}

function fillCurrencySelect (select, selected) {
  const preferred = ['EUR', 'USD', 'GBP', 'CAD', 'JPY', 'AUD']
  const available = quoteCurrencies()
  const ordered = preferred.filter((code) => available.includes(code))
  const rest = available.filter((code) => !ordered.includes(code))
  const currencies = [...ordered, ...rest]

  select.innerHTML = currencies.map(function (code) {
    return `<option value="${code}">${code}</option>`
  }).join('')

  if (currencies.includes(selected)) {
    select.value = selected
  }
}

function fillSymbolGrid (grid, currency, selectedSymbols) {
  const symbols = featuredSymbolsForCurrency(currency)
  grid.innerHTML = symbols.map(function (symbol) {
    const label = symbolLabel(symbol)
    const checked = selectedSymbols.has(symbol) ? ' checked' : ''
    const title = label !== symbol ? ` title="${symbol}"` : ''
    return `<label class="symbol-option"${title}><input type="checkbox" name="symbol" value="${symbol}"${checked}> ${label}</label>`
  }).join('')
}

function selectedSymbolsFromCrypto (crypto, currency) {
  const selected = new Set()
  crypto.split(',').map((symbol) => symbol.trim()).filter(Boolean).forEach(function (symbol) {
    selected.add(normalizeSymbolForSelection(symbol, currency))
  })
  return selected
}

function extraSymbolsFromCrypto (crypto, currency) {
  const selected = selectedSymbolsFromCrypto(crypto, currency)
  return crypto.split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol) => symbol && !selected.has(normalizeSymbolForSelection(symbol, currency)))
    .join(', ')
}

function readSettingsForm (form) {
  const currency = form.elements.currency.value
  const checked = [...form.querySelectorAll('input[name="symbol"]:checked')]
    .map((input) => input.value)
  const extra = form.elements.cryptoExtra.value
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
  const crypto = [...checked, ...extra].join(',') || kraken.defaults.crypto

  const next = {
    crypto,
    currency,
    res: form.elements.res.value,
    agg: form.elements.agg.value,
    volumeSource: (form.querySelector('input[name="volumeSource"]:checked') || {}).value || kraken.defaults.volumeSource,
    api: form.elements.api.value.trim() || kraken.defaultApi
  }

  const interval = form.elements.interval.value.trim()
  if (interval) {
    next.interval = interval
  }

  return next
}

function fillSettingsForm (form, current) {
  const currency = current.currency || kraken.defaults.currency
  fillCurrencySelect(form.elements.currency, currency)
  fillSymbolGrid(
    form.querySelector('.symbol-grid'),
    currency,
    selectedSymbolsFromCrypto(current.crypto || '', currency)
  )
  form.elements.cryptoExtra.value = extraSymbolsFromCrypto(current.crypto || '', currency)
  form.elements.res.value = current.res || kraken.defaults.res
  fillAggSelect(form.elements.agg, form.elements.res.value, current.agg || kraken.defaults.agg)
  const volumeSource = resolveKrakenVolumeSource(current.volumeSource || kraken.defaults.volumeSource)
  form.querySelectorAll('input[name="volumeSource"]').forEach(function (input) {
    input.checked = input.value === volumeSource
  })
  form.elements.interval.value = current.interval || ''
  form.elements.api.value = current.api || kraken.defaultApi
}

function createKrakenSettingsDialog () {
  const dialog = document.createElement('dialog')
  dialog.id = 'kraken-settings'
  dialog.className = 'kraken-settings'

  dialog.innerHTML = `
    <form method="dialog" class="kraken-settings-form">
      <header class="kraken-settings-header">
        <h2>Chart setup</h2>
        <p>Choose symbols, quote currency, and bar resolution.</p>
      </header>

      <fieldset>
        <legend>Symbols</legend>
        <div class="symbol-grid"></div>
        <label class="field">
          <span>Extra pairs</span>
          <input type="text" name="cryptoExtra" placeholder="e.g. LINK, AVAX or XXMRZEUR">
          <small>Any Kraken wsname base (LINK, AVAX) or full pair key.</small>
        </label>
      </fieldset>

      <div class="field-row">
        <label class="field">
          <span>Currency</span>
          <select name="currency"></select>
        </label>
        <label class="field">
          <span>Resolution</span>
          <select name="res">
            <option value="minute">Minute</option>
            <option value="hour">Hour</option>
            <option value="day">Day</option>
          </select>
        </label>
        <label class="field">
          <span>Aggregate</span>
          <select name="agg"></select>
        </label>
      </div>

      <fieldset class="volume-source">
        <legend>Volume source</legend>
        <div class="choice-row">
          <label class="choice-option">
            <input type="radio" name="volumeSource" value="from" checked>
            From (base)
          </label>
          <label class="choice-option">
            <input type="radio" name="volumeSource" value="to">
            To (quote)
          </label>
        </div>
        <small>From = traded base asset. To = quote value (base × price).</small>
      </fieldset>

      <details class="advanced">
        <summary>Advanced</summary>
        <label class="field">
          <span>Interval override (minutes)</span>
          <input type="number" name="interval" min="1" step="1" placeholder="Leave empty to use resolution mapping">
        </label>
        <label class="field">
          <span>API endpoint</span>
          <input type="text" name="api" placeholder="${kraken.defaultApi}">
        </label>
      </details>

      <footer class="kraken-settings-actions">
        <button type="button" class="secondary" data-action="cancel">Cancel</button>
        <button type="submit" class="primary" value="apply">Apply</button>
      </footer>
    </form>
  `

  document.body.appendChild(dialog)

  const form = dialog.querySelector('form')
  form.elements.res.addEventListener('change', function () {
    fillAggSelect(form.elements.agg, form.elements.res.value, form.elements.agg.value)
  })

  form.elements.currency.addEventListener('change', function () {
    fillSymbolGrid(
      form.querySelector('.symbol-grid'),
      form.elements.currency.value,
      selectedSymbolsFromCrypto(form.elements.cryptoExtra.value, form.elements.currency.value)
    )
  })

  form.addEventListener('submit', function (event) {
    event.preventDefault()
    applyKrakenParams(readSettingsForm(form))
    dialog.close()
  })

  dialog.querySelector('[data-action="cancel"]').addEventListener('click', function () {
    dialog.close()
  })

  dialog.addEventListener('close', function () {
    if (!document.querySelector('main .chart')) {
      renderKrakenCharts()
    }
  })

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      dialog.close()
    }
  })

  return dialog
}

function openKrakenSettings () {
  let dialog = document.getElementById('kraken-settings')
  if (!dialog || !dialog.querySelector('input[name="volumeSource"]')) {
    if (dialog) {
      dialog.remove()
    }
    dialog = createKrakenSettingsDialog()
  }
  fillSettingsForm(dialog.querySelector('form'), params)
  dialog.showModal()
}

function initKrakenSettings () {
  const openButton = document.getElementById('kraken-settings-open')
  if (openButton) {
    openButton.addEventListener('click', openKrakenSettings)
  }
}

function showKrakenLoadError (message) {
  const main = document.querySelector('main')
  main.innerHTML = `<p class="load-error">${message}</p>`
}

async function bootstrapKrakenPage () {
  params = resolveKrakenParams()

  try {
    await loadKrakenMarkets()
  } catch (error) {
    console.log('bootstrapKrakenPage', error.message)
    showKrakenLoadError(`Could not load Kraken markets: ${error.message}`)
    return
  }

  console.log('Parameters', params)
  initKrakenTheme()
  initKrakenSettings()

  const hasStored = Object.keys(loadStoredKrakenParams()).length > 0
  if (hasStored) {
    renderKrakenCharts()
  } else {
    openKrakenSettings()
  }
}
