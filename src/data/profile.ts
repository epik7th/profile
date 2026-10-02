export type NavLink = {
	href: string
	label: string
}

export type Contact = {
	label: string
	href: string
	icon: 'telegram' | 'mail'
}

export const navLinks: NavLink[] = [
	{ href: '#about', label: 'Обо мне' },
	{ href: '#achievements', label: 'Достижения' },
	{ href: '#skills', label: 'Навыки' },
	{ href: '#contact', label: 'Контакты' },
]

export const achievements: string[] = [
	'Интеграция приложений с крупными операторами мобильной связи РФ',
	'Интеграция со службами доставок',
	'Интеграция с платежными эквайрингами',
	'Разработка микросервисной архитектуры',
	'PWA приложения',
	'Telegram боты',
]

export const skills: string[] = [
	'Typescript',
	'Javascript',
	'PostgreSQL',
	'Redis',
	'Express',
	'React',
	'Angular',
	'WS',
	'PWA',
	'NodeJS',
	'SCSS',
	'HTML5',
]

export const contacts: Contact[] = [
	{ label: 'Написать в telegram @epik7th', href: 'https://t.me/epik7th', icon: 'telegram' },
	{
		label: 'Написать на почту epik7th@gmail.com',
		href: 'mailto:epik7th@gmail.com',
		icon: 'mail',
	},
]
