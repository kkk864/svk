if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
	gsap.registerPlugin(ScrollTrigger)
	if (typeof ScrollSmoother !== 'undefined') {
		gsap.registerPlugin(ScrollSmoother)
	}
}

const form = document.getElementById('requestForm')
const reviewInput = document.getElementById('review')
const reviewError = document.getElementById('reviewError')
const formStatus = document.getElementById('formStatus')
const yandexAuthBtn = document.getElementById('yandexAuthBtn')
const yandexLogoutBtn = document.getElementById('yandexLogoutBtn')
const submitBtn = document.getElementById('submitBtn')
const authHint = document.getElementById('authHint')

//Обновляет ScrollTrigger, если он подключён на странице
function refreshScrollTrigger() {
	if (typeof ScrollTrigger !== 'undefined') {
		ScrollTrigger.refresh()
	}
}

//Проверяет, открыт ли сайт в Яндекс Браузере
function isYandexBrowser() {
	return /YaBrowser|YaSearchBrowser/i.test(navigator.userAgent)
}

//Настраивает горизонтальную прокрутку ленты с фотографиями
function initHorizontalPhotoStrip() {
	const section = document.querySelector('.photo-strip')
	const track = document.querySelector('.photo-strip__track')
	const first = track?.querySelector('.photo-strip__cluster--first')
	const rest = track?.querySelector('.photo-strip__rest')

	//Если хотя бы одного нужного элемента нет на странице, то дальше настраивать нечего
	if (!section || !track || !first || !rest) {
		return
	}

	//Если экран узкий, то горизонтальную ленту не запускаем
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

//Если библиотеки GSAP и ScrollTrigger загружены, настраиваем анимации прокрутки
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {

	//Если устройство не сенсорное, то запускаем анимации прокрутки
	if (ScrollTrigger.isTouch !== 1) {

		//Не создаём плавную прокрутку в Яндекс Браузере и если плагин не подключён
		if (!isYandexBrowser() && typeof ScrollSmoother !== 'undefined') {
			ScrollSmoother.create({
				wrapper: '.wrapper',
				content: '.content',
				smooth: 1.5,
				effects: true
			})
		}

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

		initHorizontalPhotoStrip()

		ScrollTrigger.refresh()

		window.addEventListener('load', () => ScrollTrigger.refresh())

	}

}

//Проверяет текст отзыва и возвращает текст ошибки, если он есть
function validateReview(value) {
	const trimmed = value.trim()

	//Если поле пустое, то показываем просьбу написать отзыв
	if (!trimmed) {
		return 'Напишите отзыв'
	}

	//Если текст слишком короткий, то показываем ошибку про минимальную длину
	if (trimmed.length < 10) {
		return 'Отзыв должен содержать не менее 10 символов'
	}

	return ''
}

//Помечает поле как валидное или невалидное и показывает или скрывает текст ошибки
function setFieldState(input, errorEl, message) {
	const isValid = !message

	input.classList.toggle('is-invalid', !isValid)
	input.classList.toggle('is-valid', isValid && input.value.trim() !== '')

	//Если сообщение об ошибке есть, то показываем его, иначе скрываем блок с ошибкой
	if (message) {
		errorEl.hidden = false
		errorEl.textContent = message
	} else {
		errorEl.hidden = true
		errorEl.textContent = ''
	}

	return isValid
}

//Скрывает и очищает блок со статусом отправки формы
function clearFormStatus() {
	formStatus.hidden = true
	formStatus.textContent = ''
	formStatus.classList.remove('is-success', 'is-error')
}

//Если пользователь печатает в поле отзыва, то сбрасываем статус формы и пометки об ошибках
reviewInput.addEventListener('input', () => {
	clearFormStatus()
	reviewInput.classList.remove('is-invalid', 'is-valid')
	reviewError.hidden = true
})

//ЯНДЕКС

//Спрашивает у сервера, а не у sessionStorage, вошёл ли пользователь по настоящему
async function checkAuthStatus() {
	try {
		const response = await fetch('/me', { credentials: 'include' })
		const data = await response.json()
		return data.loggedIn
	} catch (error) {
		console.error('Не удалось проверить статус входа:', error)
		return false
	}
}

//Разблокирует поля формы, если пользователь вошёл через Яндекс ID
function enableFormFields() {
	reviewInput.disabled = false
	submitBtn.disabled = false
	yandexAuthBtn.setAttribute('aria-disabled', 'true')
	yandexAuthBtn.removeAttribute('href')
	yandexAuthBtn.querySelector('span').textContent = 'Яндекс ID подключён'
	yandexLogoutBtn.hidden = false
	authHint.textContent = 'Вы авторизованы, можно заполнить форму и отправить заявку'
	authHint.classList.add('is-success')
}

//Блокирует поля формы, если пользователь ещё не вошёл через Яндекс ID
function disableFormFields() {
	reviewInput.disabled = true
	submitBtn.disabled = true
	//Кнопка ведёт на реальный маршрут бэкенда, а не на самодельную ссылку
	yandexAuthBtn.href = '/auth/login'
	yandexAuthBtn.removeAttribute('aria-disabled')
	yandexAuthBtn.querySelector('span').textContent = 'Войти с Яндекс ID'
	yandexLogoutBtn.hidden = true
	authHint.textContent = 'Сначала войдите через Яндекс ID, чтобы разблокировать поля'
	authHint.classList.remove('is-success')
}

//Проверяет реальный статус входа при загрузке страницы и настраивает форму
async function initAuthState() {
	const loggedIn = await checkAuthStatus()
	//Если пользователь вошёл, то разблокируем форму, иначе оставляем её заблокированной
	if (loggedIn) {
		enableFormFields()
	} else {
		disableFormFields()
	}
}

initAuthState()

//Перенаправляет на реальный маршрут бэкенда, чтобы выйти из аккаунта, а не просто очищает sessionStorage
function logoutYandex() {
	window.location.href = '/auth/logout'
}

//Если пользователь нажал на кнопку выхода, то выходим из аккаунта
yandexLogoutBtn.addEventListener('click', () => {
	logoutYandex()
})

//Если пользователь отправляет форму, то сначала проверяем вход, потом само поле, и только потом отправляем данные на сервер
form.addEventListener('submit', async (event) => {
	event.preventDefault()
	clearFormStatus()

	//Проверяем реальный статус входа перед отправкой
	const loggedIn = await checkAuthStatus()

	//Если пользователь не вошёл, то отправлять форму нельзя
	if (!loggedIn) {
		formStatus.hidden = false
		formStatus.classList.add('is-error')
		formStatus.textContent = 'Сначала войдите через Яндекс ID'
		alert('Сначала войдите через Яндекс ID')
		return
	}

	const reviewMessage = validateReview(reviewInput.value)
	const reviewOk = setFieldState(reviewInput, reviewError, reviewMessage)

	//Если поле заполнено неправильно, то показываем ошибку и не отправляем форму
	if (!reviewOk) {
		formStatus.hidden = false
		formStatus.classList.add('is-error')
		formStatus.textContent = 'Проверьте правильность заполнения полей'
		alert(reviewMessage)
		refreshScrollTrigger()
		return
	}

	try {
		//Отправляем данные заявки на сервер
		const response = await fetch('/requests', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ interests: reviewInput.value.trim() })
		})

		//Если сервер принял заявку, то показываем успех, иначе показываем ошибку
		if (response.ok) {
			formStatus.hidden = false
			formStatus.classList.add('is-success')
			formStatus.textContent = 'Форма успешно отправлена'
			alert('Форма успешно отправлена')

			form.reset()
			reviewInput.classList.remove('is-valid', 'is-invalid')
			reviewError.hidden = true
		} else {
			formStatus.hidden = false
			formStatus.classList.add('is-error')
			formStatus.textContent = 'Не удалось отправить форму'
			alert('Не удалось отправить форму')
		}
	} catch (error) {
		console.error('Ошибка при отправке:', error)
		formStatus.hidden = false
		formStatus.classList.add('is-error')
		formStatus.textContent = 'Ошибка соединения с сервером'
	}

	refreshScrollTrigger()
})