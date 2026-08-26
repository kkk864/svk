if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
	gsap.registerPlugin(ScrollTrigger)
	if (typeof ScrollSmoother !== 'undefined') {
		gsap.registerPlugin(ScrollSmoother)
	}
}

const YANDEX_CLIENT_ID = ''
const YANDEX_AUTH_KEY = 'yandexAuthenticated'
const YANDEX_PENDING_KEY = 'yandexAuthPending'

const form = document.getElementById('requestForm')
const reviewInput = document.getElementById('review')
const reviewError = document.getElementById('reviewError')
const formStatus = document.getElementById('formStatus')
const yandexAuthBtn = document.getElementById('yandexAuthBtn')
const yandexLogoutBtn = document.getElementById('yandexLogoutBtn')
const submitBtn = document.getElementById('submitBtn')
const authHint = document.getElementById('authHint')

function getReturnUrl() {
	return window.location.origin + window.location.pathname
}

function refreshScrollTrigger() {
	if (typeof ScrollTrigger !== 'undefined') {
		ScrollTrigger.refresh()
	}
}

function initHorizontalPhotoStrip() {
	const section = document.querySelector('.photo-strip')
	const track = document.querySelector('.photo-strip__track')
	const first = track?.querySelector('.photo-strip__cluster--first')
	const rest = track?.querySelector('.photo-strip__rest')

	if (!section || !track || !first || !rest) {
		return
	}

	if (window.matchMedia('(max-width: 980px)').matches) {
		return
	}

	function setFirstCenterPadding() {
		const pad = Math.max((window.innerWidth - first.offsetWidth) / 2, 24)
		track.style.setProperty('--first-pad', `${pad}px`)
	}

	function getScrollDistance() {
		setFirstCenterPadding()
		const maxShift = track.scrollWidth - window.innerWidth
		return Math.max(maxShift, 0)
	}

	setFirstCenterPadding()
	gsap.set(rest, { opacity: 0 })

	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: section,
			start: 'top top',
			end: () => `+=${Math.max(getScrollDistance(), window.innerHeight * 1.2)}`,
			pin: true,
			scrub: true,
			invalidateOnRefresh: true,
			anticipatePin: 1,
			onRefresh: () => {
				setFirstCenterPadding()
				gsap.set(rest, { opacity: 0 })
			}
		}
	})

	tl.to(rest, {
		opacity: 1,
		duration: 0.15,
		ease: 'none'
	}, 0)

	tl.to(track, {
		x: () => -getScrollDistance(),
		ease: 'none',
		duration: 1
	}, 0)
}

function storageGet(key) {
	try {
		return sessionStorage.getItem(key)
	} catch (error) {
		return null
	}
}

function storageSet(key, value) {
	try {
		sessionStorage.setItem(key, value)
	} catch (error) {}
}

function storageRemove(key) {
	try {
		sessionStorage.removeItem(key)
	} catch (error) {}
}

function isYandexBrowser() {
	return /YaBrowser|YaSearchBrowser/i.test(navigator.userAgent)
}

function isYandexAuthenticated() {
	return storageGet(YANDEX_AUTH_KEY) === '1'
}

function saveYandexAuth() {
	storageSet(YANDEX_AUTH_KEY, '1')
	storageRemove(YANDEX_PENDING_KEY)
}

function clearYandexAuth() {
	storageRemove(YANDEX_AUTH_KEY)
	storageRemove(YANDEX_PENDING_KEY)
	storageRemove('yandexAccessToken')
}

function getYandexAuthUrl() {
	const returnUrl = encodeURIComponent(getReturnUrl())

	if (YANDEX_CLIENT_ID) {
		const redirectUri = encodeURIComponent(getReturnUrl())
		return `https://oauth.yandex.ru/authorize?response_type=token&client_id=${YANDEX_CLIENT_ID}&redirect_uri=${redirectUri}`
	}

	return `https://passport.yandex.ru/auth?retpath=${returnUrl}`
}

function enableFormFields() {
	reviewInput.disabled = false
	submitBtn.disabled = false
	yandexAuthBtn.setAttribute('aria-disabled', 'true')
	yandexAuthBtn.removeAttribute('href')
	yandexAuthBtn.querySelector('span').textContent = 'Яндекс ID подключён'
	yandexLogoutBtn.hidden = false
	authHint.textContent = 'Вы авторизованы — можно заполнить форму и отправить заявку'
	authHint.classList.add('is-success')
}

function disableFormFields() {
	reviewInput.disabled = true
	submitBtn.disabled = true
	yandexAuthBtn.href = getYandexAuthUrl()
	yandexAuthBtn.removeAttribute('aria-disabled')
	yandexAuthBtn.querySelector('span').textContent = 'Войти с Яндекс ID'
	yandexLogoutBtn.hidden = true
	authHint.textContent = 'Сначала войдите через Яндекс ID, чтобы разблокировать поля'
	authHint.classList.remove('is-success')
}

function parseYandexTokenFromHash() {
	const match = window.location.hash.match(/access_token=([^&]+)/)
	return match ? match[1] : null
}

function handleYandexAuthReturn() {
	const token = parseYandexTokenFromHash()

	if (token) {
		storageSet('yandexAccessToken', token)
		saveYandexAuth()
		try {
			history.replaceState(null, '', getReturnUrl())
		} catch (error) {}
		return true
	}

	if (storageGet(YANDEX_PENDING_KEY) === '1') {
		saveYandexAuth()
		try {
			history.replaceState(null, '', getReturnUrl())
		} catch (error) {}
		return true
	}

	return false
}

handleYandexAuthReturn()

if (isYandexAuthenticated()) {
	enableFormFields()
} else {
	disableFormFields()
}

if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
gsap.to('.hero, .main-title, .brand-slot', {
	opacity: 0,
	ease: 'none',
	scrollTrigger: {
		trigger: '.hero-section',
		start: 'top top',
		end: 'bottom top',
		scrub: 1.8
	}
})

if (ScrollTrigger.isTouch !== 1 && !isYandexBrowser() && typeof ScrollSmoother !== 'undefined') {

	ScrollSmoother.create({
		wrapper: '.wrapper',
		content: '.content',
		smooth: 1.05,
		effects: true
	})

}

if (ScrollTrigger.isTouch !== 1) {

	let itemsL = gsap.utils.toArray('.gallery__left .gallery__item')

	itemsL.forEach(item => {
		gsap.fromTo(item, { opacity: 0, x: -50 }, {
			opacity: 1, x: 0,
			scrollTrigger: {
				trigger: item,
				start: '-850',
				end: '-100',
				scrub: true
			}
		})
	})

	let itemsR = gsap.utils.toArray('.gallery__right .gallery__item')

	itemsR.forEach(item => {
		gsap.fromTo(item, { opacity: 0, x: 50 }, {
			opacity: 1, x: 0,
			scrollTrigger: {
				trigger: item,
				start: '-750',
				end: 'top',
				scrub: true
			}
		})
	})

	gsap.fromTo('.request-form', { opacity: 0, y: 40 }, {
		opacity: 1,
		y: 0,
		scrollTrigger: {
			trigger: '.request-form',
			start: 'top 85%',
			end: 'top 55%',
			scrub: true
		}
	})

	ScrollTrigger.refresh()
	window.addEventListener('load', () => ScrollTrigger.refresh())

}

	initHorizontalPhotoStrip()
	ScrollTrigger.refresh()
	window.addEventListener('load', () => ScrollTrigger.refresh())
}

function logoutYandex() {
	clearYandexAuth()
	reviewInput.value = ''
	reviewInput.classList.remove('is-invalid', 'is-valid')
	reviewError.hidden = true
	clearFormStatus()
	disableFormFields()
}

function validateReview(value) {
	const trimmed = value.trim()

	if (!trimmed) {
		return 'Напишите отзыв'
	}

	if (trimmed.length < 10) {
		return 'Отзыв должен содержать не менее 10 символов'
	}

	return ''
}

function setFieldState(input, errorEl, message) {
	const isValid = !message

	input.classList.toggle('is-invalid', !isValid)
	input.classList.toggle('is-valid', isValid && input.value.trim() !== '')

	if (message) {
		errorEl.hidden = false
		errorEl.textContent = message
	} else {
		errorEl.hidden = true
		errorEl.textContent = ''
	}

	return isValid
}

function clearFormStatus() {
	formStatus.hidden = true
	formStatus.textContent = ''
	formStatus.classList.remove('is-success', 'is-error')
}

yandexAuthBtn.addEventListener('click', () => {
	if (!isYandexAuthenticated()) {
		storageSet(YANDEX_PENDING_KEY, '1')
	}
})

yandexLogoutBtn.addEventListener('click', () => {
	logoutYandex()
})

reviewInput.addEventListener('input', () => {
	clearFormStatus()
	reviewInput.classList.remove('is-invalid', 'is-valid')
	reviewError.hidden = true
})

form.addEventListener('submit', (event) => {
	event.preventDefault()
	clearFormStatus()

	if (!isYandexAuthenticated()) {
		formStatus.hidden = false
		formStatus.classList.add('is-error')
		formStatus.textContent = 'Сначала войдите через Яндекс ID'
		alert('Сначала войдите через Яндекс ID')
		return
	}

	const reviewMessage = validateReview(reviewInput.value)
	const reviewOk = setFieldState(reviewInput, reviewError, reviewMessage)

	if (!reviewOk) {
		formStatus.hidden = false
		formStatus.classList.add('is-error')
		formStatus.textContent = 'Проверьте правильность заполнения полей'
		alert(reviewMessage)
		refreshScrollTrigger()
		return
	}

	reviewInput.classList.add('is-valid')
	formStatus.hidden = false
	formStatus.classList.add('is-success')
	formStatus.textContent = 'Форма успешно отправлена'
	alert('Форма успешно отправлена')
	refreshScrollTrigger()
})
