const indicatorTheme = {
  storageKey: 'techan.kraken.theme'
}

function initIndicatorTheme () {
  try {
    const pref = localStorage.getItem(indicatorTheme.storageKey)
    const theme = pref === 'dark'
      ? 'dark'
      : pref === 'light'
        ? 'light'
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', theme)
    if (pref) {
      document.documentElement.setAttribute('data-theme-pref', pref)
    }
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

function setIndicatorTheme (theme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-theme-pref', theme)
  try {
    localStorage.setItem(indicatorTheme.storageKey, theme)
  } catch (error) {
    console.log('setIndicatorTheme', error.message)
  }
  updateIndicatorThemeToggle()
}

function updateIndicatorThemeToggle () {
  const toggle = document.getElementById('indicator-theme-toggle')
  if (!toggle) {
    return
  }
  const theme = document.documentElement.getAttribute('data-theme') || 'light'
  const next = theme === 'dark' ? 'light' : 'dark'
  toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false')
  toggle.setAttribute('aria-label', `Switch to ${next} mode`)
  toggle.title = `Switch to ${next} mode`
}

function mountIndicatorThemeToggle () {
  const header = document.querySelector('header')
  if (!header || document.getElementById('indicator-theme-toggle')) {
    return
  }

  if (!header.querySelector('.header-text')) {
    const textWrap = document.createElement('div')
    textWrap.className = 'header-text'
    while (header.firstChild) {
      textWrap.appendChild(header.firstChild)
    }
    header.appendChild(textWrap)
  }

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.id = 'indicator-theme-toggle'
  toggle.className = 'theme-toggle'
  toggle.innerHTML = [
    '<svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">',
    '<path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>',
    '</svg>',
    '<svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">',
    '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
    '<g stroke="currentColor" stroke-width="2" stroke-linecap="round">',
    '<line x1="12" y1="2" x2="12" y2="5"/>',
    '<line x1="12" y1="19" x2="12" y2="22"/>',
    '<line x1="2" y1="12" x2="5" y2="12"/>',
    '<line x1="19" y1="12" x2="22" y2="12"/>',
    '<line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>',
    '<line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>',
    '<line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>',
    '<line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>',
    '</g>',
    '</svg>'
  ].join('')

  toggle.addEventListener('click', function () {
    const theme = document.documentElement.getAttribute('data-theme') || 'light'
    setIndicatorTheme(theme === 'dark' ? 'light' : 'dark')
  })

  header.appendChild(toggle)
  updateIndicatorThemeToggle()
}

initIndicatorTheme()

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountIndicatorThemeToggle)
} else {
  mountIndicatorThemeToggle()
}
