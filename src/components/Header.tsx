import { navLinks } from '../data/profile'

export default function Header() {
	return (
		<header>
			<div className="logo">
				<span>epik7th</span>
			</div>
			<nav className="header-nav">
				<ul>
					{navLinks.map((link) => (
						<li key={link.href}>
							<a href={link.href}>{link.label}</a>
						</li>
					))}
				</ul>
			</nav>
		</header>
	)
}
